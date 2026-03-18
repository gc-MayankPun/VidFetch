#!/usr/bin/env python3
"""
ytdlp.py — YouTube downloader using pytubefix
Usage:
  python3 ytdlp.py info <url> [cookies_path]
  python3 ytdlp.py mp4 <url> <itag> <output_path>
  python3 ytdlp.py mp3 <url> <itag> <output_path>
"""

import sys
import json
import os
from pytubefix import YouTube
from pytubefix.cli import on_progress


def get_yt(url):
    return YouTube(url, on_progress_callback=on_progress, use_oauth=False, allow_oauth_cache=False)


def cmd_info(url, cookies_path=None):
    yt = get_yt(url)

    streams = yt.streams
    formats = []

    # Best MP4 progressive (video+audio combined)
    progressive = streams.filter(progressive=True, file_extension="mp4").order_by("resolution").last()
    # Best video only + audio for DASH
    video_dash = streams.filter(adaptive=True, file_extension="mp4", only_video=True).order_by("resolution").last()
    audio_dash = streams.filter(adaptive=True, only_audio=True).order_by("abr").last()

    if video_dash and audio_dash:
        formats.append({
            "itag": f"{video_dash.itag}+{audio_dash.itag}",
            "label": f"{video_dash.resolution} MP4",
            "ext": "mp4",
            "type": "mp4",
        })
    elif progressive:
        formats.append({
            "itag": str(progressive.itag),
            "label": f"{progressive.resolution} MP4",
            "ext": "mp4",
            "type": "mp4",
        })

    # MP3 — use best audio stream
    audio = streams.filter(only_audio=True).order_by("abr").last()
    if audio:
        formats.append({
            "itag": str(audio.itag),
            "label": "MP3 Audio",
            "ext": "mp3",
            "type": "mp3",
        })

    # Thumbnail
    thumbnail = yt.thumbnail_url

    print(json.dumps({
        "ok": True,
        "title": yt.title,
        "thumbnail": thumbnail,
        "duration": yt.length,
        "formats": formats,
        "url": url,
    }))


def cmd_download_mp4(url, itag, output_path):
    yt = get_yt(url)
    tmp_dir = os.path.dirname(output_path)
    uid = os.path.basename(output_path).replace(".mp4", "")

    if "+" in itag:
        # DASH — download video and audio separately then merge with ffmpeg
        video_itag, audio_itag = itag.split("+")
        video_stream = yt.streams.get_by_itag(int(video_itag))
        audio_stream = yt.streams.get_by_itag(int(audio_itag))

        video_file = video_stream.download(output_path=tmp_dir, filename=f"{uid}_video.mp4")
        audio_file = audio_stream.download(output_path=tmp_dir, filename=f"{uid}_audio.mp4")

        # Merge with ffmpeg
        merged = os.path.join(tmp_dir, f"{uid}.mp4")
        os.system(f'ffmpeg -i "{video_file}" -i "{audio_file}" -c copy "{merged}" -y -loglevel quiet')

        # Cleanup intermediates
        try:
            os.remove(video_file)
            os.remove(audio_file)
        except:
            pass

        print(json.dumps({"ok": True, "path": merged}))
    else:
        # Progressive — single stream with video+audio
        stream = yt.streams.get_by_itag(int(itag))
        out = stream.download(output_path=tmp_dir, filename=f"{uid}.mp4")
        print(json.dumps({"ok": True, "path": out}))


def cmd_download_mp3(url, itag, output_path):
    yt = get_yt(url)
    tmp_dir = os.path.dirname(output_path)
    uid = os.path.basename(output_path)

    stream = yt.streams.get_by_itag(int(itag))
    # Download as original format first
    raw_file = stream.download(output_path=tmp_dir, filename=f"{uid}_raw")

    # Convert to mp3 with ffmpeg
    mp3_file = os.path.join(tmp_dir, f"{uid}.mp3")
    os.system(f'ffmpeg -i "{raw_file}" -vn -ab 192k -ar 44100 -f mp3 "{mp3_file}" -y -loglevel quiet')

    try:
        os.remove(raw_file)
    except:
        pass

    print(json.dumps({"ok": True, "path": mp3_file}))


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
            cmd_download_mp4(url, itag, output)

        elif action == "mp3":
            url = sys.argv[2]
            itag = sys.argv[3]
            output = sys.argv[4]
            cmd_download_mp3(url, itag, output)

        else:
            print(json.dumps({"ok": False, "error": f"Unknown action: {action}"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)