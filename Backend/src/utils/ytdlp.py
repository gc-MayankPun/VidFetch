#!/usr/bin/env python3
import sys
import json
import os
import shutil
import subprocess
import time

YTDLP_BIN = "/usr/local/bin/yt-dlp"

import os as _os
print(f"YTDLP_BIN exists: {_os.path.exists(YTDLP_BIN)}", file=__import__('sys').stderr)


# -----------------------------
# Ensure Node is available
# -----------------------------
_node = (
    shutil.which("node") or
    "/opt/render/project/nodes/node-22.22.0/bin/node"
)
if _node and os.path.exists(_node):
    _node_dir = os.path.dirname(_node)
    os.environ["PATH"] = f"{_node_dir}:{os.environ.get('PATH', '')}"


# -----------------------------
# Base Command Builder
# -----------------------------
def base_cmd(cookies_path=None, client="web"):
    for p in [
        os.path.expanduser("~/.deno/bin"),
        "/opt/render/project/nodes/node-22.22.0/bin",
        "/usr/bin",
        "/usr/local/bin",
    ]:
        if os.path.isdir(p) and p not in os.environ.get("PATH", ""):
            os.environ["PATH"] = f"{p}:{os.environ['PATH']}"

    cmd = [
        YTDLP_BIN,
        "--no-playlist",
        "--no-warnings",
        "--force-ipv4",
        "--sleep-requests", "2",
        "--socket-timeout", "30",
        "--http-chunk-size", "1048576",
        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--extractor-args", f"youtube:player_client={client}",
    ]

    if cookies_path and os.path.exists(cookies_path):
        cmd += ["--cookies", cookies_path]

    return cmd


# -----------------------------
# Run Command with Retry Logic
# -----------------------------
def run_cmd_with_retry(url, base_args, cookies_path=None, retries=3):
    clients = ["web", "web_safari", "android", "android_creator"]

    last_error = None

    for attempt in range(retries):
        for client in clients:
            try:
                cmd = base_cmd(cookies_path, client) + base_args + [url]

                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    env=os.environ.copy(),
                    timeout=300,
                )

                if result.returncode == 0:
                    return result.stdout.strip()

                last_error = result.stderr.strip()

            except subprocess.TimeoutExpired:
                last_error = "Command timed out after 5 minutes"
            except Exception as e:
                last_error = str(e)

        if attempt < retries - 1:
            wait_time = 5 * (attempt + 1)
            print(f"Retrying in {wait_time}s...", file=sys.stderr)
            time.sleep(wait_time)

    raise Exception(last_error or "yt-dlp failed after retries")


# -----------------------------
# INFO COMMAND
# -----------------------------
def cmd_info(url, cookies_path=None):
    raw = run_cmd_with_retry(url, ["--dump-json"], cookies_path)
    info = json.loads(raw)

    formats = info.get("formats", [])

    # Best combined (video + audio together)
    combined = [
        f for f in formats
        if f.get("vcodec") != "none" and f.get("acodec") != "none"
    ]
    combined.sort(key=lambda f: f.get("height") or 0, reverse=True)
    best_combined = combined[0] if combined else None

    # Best video-only
    video_only = [
        f for f in formats
        if f.get("vcodec") != "none"
        and (f.get("acodec") == "none")
    ]
    video_only.sort(key=lambda f: f.get("height") or 0, reverse=True)
    best_video = video_only[0] if video_only else None

    # Best audio-only
    audio_only = [
        f for f in formats
        if f.get("vcodec") == "none"
        and f.get("acodec") != "none"
    ]
    audio_only.sort(key=lambda f: f.get("abr") or 0, reverse=True)
    best_audio = audio_only[0] if audio_only else None

    result_formats = []

    # MP4: Use best video + audio
    if best_video and best_audio:
        result_formats.append({
            "itag": f"{best_video['format_id']}+{best_audio['format_id']}",
            "label": f"{best_video.get('height', '?')}p MP4",
            "ext": "mp4",
            "type": "mp4",
        })
    elif best_combined:
        result_formats.append({
            "itag": best_combined["format_id"],
            "label": best_combined.get("format_note") or "MP4",
            "ext": "mp4",
            "type": "mp4",
        })

    # MP3: Prefer audio-only, fall back to best available
    mp3_itag = None

    if best_audio:
        mp3_itag = best_audio["format_id"]
    elif best_combined:
        mp3_itag = best_combined["format_id"]
    elif best_video:
        mp3_itag = best_video["format_id"]

    if mp3_itag:
        result_formats.append({
            "itag": mp3_itag,
            "label": "MP3 Audio",
            "ext": "mp3",
            "type": "mp3",
        })

    thumbnails = sorted(
        [t for t in (info.get("thumbnails") or []) if t.get("url")],
        key=lambda t: (t.get("width") or 0) * (t.get("height") or 0),
        reverse=True,
    )
    best_thumb = thumbnails[0]["url"] if thumbnails else info.get("thumbnail", "")

    print(json.dumps({
        "ok": True,
        "title": info.get("title", ""),
        "thumbnail": best_thumb,
        "duration": info.get("duration", 0),
        "formats": result_formats,
        "url": url,
    }))


# ─────────────────────────────────
# DOWNLOAD MP3
# ─────────────────────────────────
def cmd_download_mp3(url, itag, output_path, cookies_path=None):
    output_dir = os.path.dirname(output_path)
    os.makedirs(output_dir, exist_ok=True)

    output_template = output_path.rsplit('.mp3', 1)[0] if output_path.endswith('.mp3') else output_path

    run_cmd_with_retry(
        url,
        [
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "192K",
            "--format-sort", "asr,abr",
            "--no-format-sort-force",
            "-f", "bestaudio/best",
            "-o", output_template,
        ],
        cookies_path
    )

    if not os.path.exists(output_path):
        raise Exception(f"MP3 conversion failed - file not found at {output_path}")

    file_size = os.path.getsize(output_path)
    if file_size < 100000:
        raise Exception(f"MP3 file too small ({file_size} bytes) - conversion may have failed")

    try:
        with open(output_path, 'rb') as f:
            header = f.read(3)
            is_mp3 = header.startswith(b'\xff') or header.startswith(b'ID3')
            if not is_mp3:
                raise Exception(f"File isn't valid MP3 - header: {header.hex()}")
    except Exception as e:
        raise Exception(f"MP3 validation failed: {str(e)}")

    print(json.dumps({"ok": True, "path": output_path}))


# ─────────────────────────────────
# DOWNLOAD MP4
# ─────────────────────────────────
def cmd_download_mp4(url, output_path, cookies_path=None):
    output_dir = os.path.dirname(output_path)
    os.makedirs(output_dir, exist_ok=True)

    run_cmd_with_retry(
        url,
        [
            "-f", "bestvideo+bestaudio/best",
            "--format-sort", "res,ext:mp4:m4a",
            "--merge-output-format", "mp4",
            "-o", output_path,
        ],
        cookies_path
    )

    if not os.path.exists(output_path):
        raise Exception(f"MP4 download failed - output file not created at {output_path}")

    print(json.dumps({"ok": True, "path": output_path}))


# ─────────────────────────────────
# RESOLVE DIRECT URL (no download)
# ─────────────────────────────────
def cmd_resolve(url, itag, cookies_path=None):
    raw = run_cmd_with_retry(url, [
        "--dump-json",
        "-f", itag,
    ], cookies_path)

    info = json.loads(raw)

    formats = info.get("formats", [])
    target = None

    for f in formats:
        fid = f.get("format_id", "")
        if fid == itag:
            target = f
            break

    direct_url = (target or {}).get("url") or info.get("url")
    ext = (target or {}).get("ext", "mp4")
    title = info.get("title", "video")

    if not direct_url:
        print(json.dumps({"ok": False, "error": "Could not resolve direct URL"}))
        sys.exit(1)

    print(json.dumps({
        "ok": True,
        "directUrl": direct_url,
        "ext": ext,
        "title": title,
    }))


# ─────────────────────────────────
# MAIN
# ─────────────────────────────────
if __name__ == "__main__":
    try:
        action = sys.argv[1]

        if action == "info":
            cmd_info(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)

        elif action == "mp4":
            cmd_download_mp4(
                sys.argv[2],
                sys.argv[3],
                sys.argv[4] if len(sys.argv) > 4 else None
            )

        elif action == "mp3":
            cmd_download_mp3(
                sys.argv[2],
                sys.argv[3],
                sys.argv[4],
                sys.argv[5] if len(sys.argv) > 5 else None
            )

        elif action == "resolve":
            cmd_resolve(
                sys.argv[2],
                sys.argv[3],
                sys.argv[4] if len(sys.argv) > 4 else None
            )

        else:
            print(json.dumps({"ok": False, "error": "Invalid action"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)