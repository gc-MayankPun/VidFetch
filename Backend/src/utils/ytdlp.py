#!/usr/bin/env python3
import sys
import json
import os
import shutil
import subprocess
import time

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
def base_cmd(cookies_path=None, client="android"):
    for p in [
        os.path.expanduser("~/.deno/bin"),
        "/opt/render/project/nodes/node-22.22.0/bin",
        "/usr/bin",
        "/usr/local/bin",
    ]:
        if os.path.isdir(p) and p not in os.environ.get("PATH", ""):
            os.environ["PATH"] = f"{p}:{os.environ['PATH']}"

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--no-warnings",
        "--force-ipv4",
        "--sleep-requests", "1",
        "--extractor-args", f"youtube:player_client={client}",
        "--format-sort", "res,ext:mp4:m4a",
        "--user-agent", "com.google.android.youtube/17.31.35 (Linux; U; Android 11)",
    ]

    if cookies_path and os.path.exists(cookies_path):
        cmd += ["--cookies", cookies_path]

    return cmd


# -----------------------------
# Run Command with Retry Logic
# -----------------------------
def run_cmd_with_retry(url, base_args, cookies_path=None, retries=3):
    clients = ["android", "web_safari", "android_creator"]

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
                )

                if result.returncode == 0:
                    return result.stdout.strip()

                last_error = result.stderr.strip()

            except Exception as e:
                last_error = str(e)

        # small delay before retry
        time.sleep(2)

    raise Exception(last_error or "yt-dlp failed after retries")


# -----------------------------
# INFO COMMAND
# -----------------------------
def cmd_info(url, cookies_path=None):
    raw = run_cmd_with_retry(url, ["--dump-json"], cookies_path)
    info = json.loads(raw)

    formats = info.get("formats", [])

    # Best combined
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

    mp3_itag = (best_audio or best_combined or {}).get("format_id")
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


# -----------------------------
# DOWNLOAD MP4
# -----------------------------
def cmd_download_mp4(url, output_path, cookies_path=None):
    run_cmd_with_retry(
        url,
        [
            "-f", "bestvideo+bestaudio/best",
            "--merge-output-format", "mp4",
            "--overwrites",
            "-o", output_path,
        ],
        cookies_path
    )

    print(json.dumps({"ok": True, "path": output_path}))


# -----------------------------
# DOWNLOAD MP3
# -----------------------------
def cmd_download_mp3(url, output_path, cookies_path=None):
    run_cmd_with_retry(
        url,
        [
            "-f", "bestaudio",
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "192K",
            "--overwrites",
            "-o", output_path,
        ],
        cookies_path
    )

    print(json.dumps({"ok": True, "path": output_path}))



# -----------------------------
# RESOLVE DIRECT URL (no download)
# -----------------------------
def cmd_resolve(url, itag, cookies_path=None):
    raw = run_cmd_with_retry(url, [
        "--dump-json",
        "-f", itag,
    ], cookies_path)

    info = json.loads(raw)

    # Find the matching format and extract its direct URL
    formats = info.get("formats", [])
    target = None

    for f in formats:
        fid = f.get("format_id", "")
        if fid == itag:
            target = f
            break

    # For combined formats like "123+456", yt-dlp merges them.
    # In resolve mode we return the best available direct URL.
    # If no exact match, use the url from the top-level info (best merged).
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

# -----------------------------
# MAIN
# -----------------------------
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
                sys.argv[4] if len(sys.argv) > 4 else None
            )

        elif action == "resolve":
            cmd_resolve(
                sys.argv[2],   # url
                sys.argv[3],   # itag
                sys.argv[4] if len(sys.argv) > 4 else None   # cookies
            )

        else:
            print(json.dumps({"ok": False, "error": "Invalid action"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)