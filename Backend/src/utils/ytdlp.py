#!/usr/bin/env python3
"""
ytdlp.py — yt-dlp Python library wrapper
Called from Node.js controller via spawn('python3', ['ytdlp.py', action, ...args])

Usage:
  python3 ytdlp.py info <url> [cookies_path]
  python3 ytdlp.py download <url> <itag> <output_path> [cookies_path]
  python3 ytdlp.py mp3 <url> <itag> <output_path> [cookies_path]
"""

import sys
import json
import os
import yt_dlp
import logging

# Redirect yt-dlp internal logs to stderr so they don't corrupt our JSON stdout
class StderrLogger:
    def debug(self, msg):
        print(msg, file=sys.stderr)
    def info(self, msg):
        print(msg, file=sys.stderr)
    def warning(self, msg):
        print(msg, file=sys.stderr)
    def error(self, msg):
        print(msg, file=sys.stderr)


def get_opts(cookies_path=None):
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "logger": StderrLogger(),   # ← all yt-dlp output goes to stderr
        "extractor_args": {
            "youtube": {
                "player_client": ["tv_embedded", "web"],
            }
        },
    }
    if cookies_path and os.path.exists(cookies_path):
        opts["cookiefile"] = cookies_path
    return opts


def cmd_info(url, cookies_path=None):
    opts = get_opts(cookies_path)
    opts["skip_download"] = True

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

    formats = info.get("formats", [])

    # Best combined (video+audio)
    combined = [
        f for f in formats
        if f.get("vcodec") and f["vcodec"] != "none"
        and f.get("acodec") and f["acodec"] != "none"
    ]
    combined.sort(key=lambda f: f.get("height") or 0, reverse=True)
    best_combined = combined[0] if combined else None

    # Best video-only (DASH)
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
    thumbnails = info.get("thumbnails") or []
    thumbnails_sorted = sorted(
        [t for t in thumbnails if t.get("url")],
        key=lambda t: (t.get("width") or 0) * (t.get("height") or 0),
        reverse=True,
    )
    best_thumb = thumbnails_sorted[0]["url"] if thumbnails_sorted else info.get("thumbnail", "")

    print(json.dumps({
        "ok": True,
        "title": info.get("title", ""),
        "thumbnail": best_thumb,
        "duration": info.get("duration", 0),
        "formats": result_formats,
        "url": url,
    }))


def cmd_download_mp4(url, itag, output_path, cookies_path=None):
    # print(f"[mp4] url={url} itag={itag} output={output_path}", file=sys.stderr)
    opts = get_opts(cookies_path)
    opts.update({
        "format": itag,
        "outtmpl": {"default": output_path},  # ← dict form forces exact path
        "merge_output_format": "mp4",
        "no_playlist": True,
        "overwrites": True,
    })

    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

    # Scan tmp dir for any file starting with the uid (basename of output_path)
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
    opts = get_opts(cookies_path)
    opts.update({
        "format": itag,
        "outtmpl": {"default": output_path},  # ← dict form forces exact path
        "no_playlist": True,
        "overwrites": True,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    })

    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

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