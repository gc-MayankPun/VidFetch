#!/usr/bin/env python3
import sys
import json
import os
import shutil
import subprocess

# Ensure node is in PATH for n-challenge solving
_node = (
    shutil.which("node") or
    "/opt/render/project/nodes/node-22.22.0/bin/node"
)
if _node and os.path.exists(_node):
    _node_dir = os.path.dirname(_node)
    os.environ["PATH"] = f"{_node_dir}:{os.environ.get('PATH', '')}"


def base_cmd(cookies_path=None):
    # Ensure deno and node are in PATH for JS challenge solving
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
        "--extractor-args", "youtube:player_client=web",
        "--format-sort", "res,ext:mp4:m4a",
    ]
    if cookies_path and os.path.exists(cookies_path):
        cmd += ["--cookies", cookies_path]
    return cmd


def run_cmd(cmd):
    """Run a command and return stdout. Raises on non-zero exit."""
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    if result.returncode != 0:
        raise Exception(result.stderr.strip() or f"yt-dlp exited with code {result.returncode}")
    return result.stdout.strip()


def cmd_info(url, cookies_path=None):
    cmd = base_cmd(cookies_path) + ["--dump-json", url]
    raw = run_cmd(cmd)
    info = json.loads(raw)

    formats = info.get("formats", [])

    # Best combined (video+audio)
    combined = [
        f for f in formats
        if f.get("vcodec") and f["vcodec"] != "none"
        and f.get("acodec") and f["acodec"] != "none"
    ]
    combined.sort(key=lambda f: f.get("height") or 0, reverse=True)
    best_combined = combined[0] if combined else None

    # Best DASH video-only
    video_only = [
        f for f in formats
        if f.get("vcodec") and f["vcodec"] != "none"
        and (not f.get("acodec") or f["acodec"] == "none")
        and f.get("ext") in ("mp4", "webm")
    ]
    video_only.sort(key=lambda f: f.get("height") or 0, reverse=True)
    best_video = video_only[0] if video_only else None

    # Best audio-only
    audio_only = [
        f for f in formats
        if (not f.get("vcodec") or f["vcodec"] == "none")
        and f.get("acodec") and f["acodec"] != "none"
    ]
    audio_only.sort(key=lambda f: f.get("abr") or 0, reverse=True)
    best_audio = audio_only[0] if audio_only else None

    result_formats = []

    # MP4
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
            "label": best_combined.get("format_note") or f"{best_combined.get('height', '')}p",
            "ext": "mp4",
            "type": "mp4",
        })

    # MP3
    mp3_itag = (best_audio or best_combined or {}).get("format_id")
    if mp3_itag:
        result_formats.append({
            "itag": mp3_itag,
            "label": "MP3 Audio",
            "ext": "mp3",
            "type": "mp3",
        })

    # Best thumbnail
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


def cmd_download_mp4(url, itag, output_path, cookies_path=None):
    cmd = base_cmd(cookies_path) + [
        "-f", "95/94/93/18/bestvideo+bestaudio/best",  # ← ignore itag, always use best
        "--merge-output-format", "mp4",
        "--overwrites",
        "-o", output_path,
        url,
    ]
    run_cmd(cmd)

    uid = os.path.basename(output_path).replace(".mp4", "")
    tmp_dir = os.path.dirname(output_path)

    for f in os.listdir(tmp_dir):
        if f.startswith(uid):
            full_path = os.path.join(tmp_dir, f)
            print(json.dumps({"ok": True, "path": full_path}))
            return

    print(json.dumps({"ok": False, "error": "Output file not found after download"}))
    sys.exit(1)


def cmd_download_mp3(url, itag, output_path, cookies_path=None):
    cmd = base_cmd(cookies_path) + [
        "-f", "140/bestaudio/best",  # ← ignore itag, always use best audio
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "192K",
        "--overwrites",
        "-o", output_path,
        url,
    ]
    run_cmd(cmd)

    uid = os.path.basename(output_path)
    tmp_dir = os.path.dirname(output_path)

    for f in os.listdir(tmp_dir):
        if f.startswith(uid):
            full_path = os.path.join(tmp_dir, f)
            print(json.dumps({"ok": True, "path": full_path}))
            return

    print(json.dumps({"ok": False, "error": "MP3 output file not found"}))
    sys.exit(1)
    

if __name__ == "__main__":
    try:
        action = sys.argv[1]
        cookies = None

        if action == "info":
            url = sys.argv[2]
            cookies = sys.argv[3] if len(sys.argv) > 3 else None
            cmd_info(url, cookies)

        elif action == "mp4":
            url = sys.argv[2]
            itag = sys.argv[3]
            output = sys.argv[4]
            cookies = sys.argv[5] if len(sys.argv) > 5 else None
            cmd_download_mp4(url, itag, output, cookies)

        elif action == "mp3":
            url = sys.argv[2]
            itag = sys.argv[3]
            output = sys.argv[4]
            cookies = sys.argv[5] if len(sys.argv) > 5 else None
            cmd_download_mp3(url, itag, output, cookies)

        else:
            print(json.dumps({"ok": False, "error": f"Unknown action: {action}"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)