# VidFetch — YouTube Downloader

A full-stack YouTube downloader built with **React 19** and **Express.js**, powered by **yt-dlp** and **ffmpeg**. Paste a YouTube URL to download the video as MP4, extract audio as MP3, or save the thumbnail.

![React](https://img.shields.io/badge/React-v19-61dafb?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express%205-90c53f?logo=node.js)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker)
![License](https://img.shields.io/badge/License-ISC-green)

---

## ✨ Features

- **MP4 Download** — best available quality, DASH streams merged automatically via ffmpeg
- **MP3 Download** — audio extracted and converted to MP3 via ffmpeg
- **Thumbnail Download** — highest resolution thumbnail saved as JPG/PNG
- **Bot bypass** — Chrome user-agent spoofing, multi-client retry (web → ios → android → mweb), Deno for YouTube JS challenge solving, and cookie-based authentication
- **Client rotation** — automatically rotates through YouTube player clients until one succeeds
- **In-memory caching** — same video doesn't hit YouTube twice (5 min TTL)
- **Dockerised** — runs identically everywhere, deployed on Render as a container

---

## 🛠 Tech Stack

### Frontend
- **React 19** & **Vite**
- **Sass/SCSS** for styling
- **Axios** for API calls
- **React Toastify** for notifications

### Backend
- **Node.js** & **Express.js 5**
- **yt-dlp** — YouTube extraction engine (system binary)
- **ffmpeg** — audio conversion and stream merging
- **Deno** — required by yt-dlp to solve YouTube's JS challenges
- **CORS** & **express-rate-limit** for security

---

## 📁 Project Structure

```
VidFetch/
├── Frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── home/          (page + SCSS)
│   │   │   └── video/
│   │   │       ├── components/
│   │   │       │   └── Video.jsx
│   │   │       ├── hooks/
│   │   │       │   └── useVideo.js
│   │   │       ├── services/
│   │   │       │   └── video.api.js
│   │   │       └── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── video.controller.js
│   │   ├── routes/
│   │   │   └── video.routes.js
│   │   └── utils/
│   │       └── utils.js
│   ├── public/               ← built frontend (copied from Frontend/dist)
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── Dockerfile
└── README.md
```

---

## 🚀 Local Setup

### Prerequisites

- Node.js v18+
- Python + pip
- yt-dlp — `pip install yt-dlp` or `sudo pacman -S yt-dlp`
- ffmpeg — `sudo apt install ffmpeg` or `brew install ffmpeg`
- Deno — `curl -fsSL https://deno.land/install.sh | sh`

### Backend

```bash
cd Backend
npm install
npm run dev
```

Runs on `http://localhost:3000`

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. Set `VITE_API_URL=http://localhost:3000` in `Frontend/.env`.

---

## 🔌 API Endpoints

Base URL: `/api/videos`

### `POST /info`
Fetch video metadata and available formats.

**Request body:**
```json
{ "url": "https://www.youtube.com/watch?v=..." }
```

**Response:**
```json
{
  "message": "Video fetched successfully",
  "video": {
    "title": "Video Title",
    "thumbnail": "https://i.ytimg.com/vi/.../maxresdefault.jpg",
    "duration": 212,
    "formats": [
      {
        "itag": "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
        "label": "1080p MP4",
        "ext": "mp4",
        "type": "mp4"
      },
      {
        "itag": "ba/b",
        "label": "MP3 Audio",
        "ext": "mp3",
        "type": "mp3"
      }
    ],
    "url": "https://www.youtube.com/watch?v=..."
  }
}
```

### `GET /download?url=&itag=&type=`
Stream download directly to client. `type` is `mp4` or `mp3`.

- **MP4** — streams via stdout pipe
- **MP3** — writes to temp file (ffmpeg requires a complete file, not a pipe), then streams and cleans up

### `GET /thumbnail?url=`
Proxies and downloads the highest resolution thumbnail image.

---

## 🔧 Backend Architecture

```
POST /info
    → runWithRetry (rotates web → ios → android → mweb)
    → yt-dlp --dump-json + Deno JS challenge solver
    → return format selector strings (not raw format IDs)

GET /download (mp4)
    → yt-dlp -f "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b"
    → stdout pipe → response stream

GET /download (mp3)
    → yt-dlp -x --audio-format mp3 -o /tmp/file
    → wait for ffmpeg to finish
    → res.sendFile → cleanup temp file

GET /thumbnail
    → fetch(thumbnailUrl) → proxy to browser
```

---

## 🐳 Docker

The app is fully containerised. Deno is installed system-wide so all users (including the non-root `app` user) can access it.

```dockerfile
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl python3 ca-certificates unzip \
    && rm -rf /var/lib/apt/lists/*

# Deno — system-wide (required by yt-dlp for JS challenge solving)
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh
RUN deno --version

# yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp
RUN yt-dlp --version

RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN chown -R app:app /app

USER app

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## ☁️ Render Deployment

Deployed as a Docker container on Render.

### Steps

1. Push repo to GitHub
2. Go to Render → **New → Web Service**
3. Select **Docker** as the environment
4. Connect your repo — Render auto-detects the Dockerfile
5. Add environment variables (see below)
6. Click **Deploy**

### Environment Variables

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `YOUTUBE_COOKIES` | Full contents of your `cookies.txt` (Netscape format) |

### Setting up YouTube Cookies

YouTube blocks datacenter IPs (Render, AWS, etc.). Cookies from a logged-in browser session are required.

1. Install **"Get cookies.txt LOCALLY"** extension (Chrome/Firefox)
2. Visit **youtube.com** while logged in
3. Click the extension → **Export** → saves `cookies.txt`
4. Copy the **entire file contents** into the `YOUTUBE_COOKIES` env var on Render
5. Redeploy — cookies are written to disk on startup

> Cookies expire periodically. If downloads start failing, re-export and update the env var.

---

## ⚠️ Key Lessons Learned

### 1. Deno is required on the server
yt-dlp uses Deno to solve YouTube's JS challenges. It works locally if Deno is installed (even from an unrelated project). On Render it must be explicitly installed in the Dockerfile. Install it **system-wide** with `DENO_INSTALL=/usr/local` — not in `/root/.deno` which the non-root `app` user cannot access.

### 2. ffmpeg cannot work with a pipe
`-x --audio-format mp3` with `-o -` (stdout) produces 0 bytes. ffmpeg needs a complete file on disk to convert. The fix is writing to a temp file first, waiting for yt-dlp + ffmpeg to finish, then streaming the completed file to the client.

### 3. Use format selector strings, not format IDs
YouTube format IDs like `137+140` are not universal — they vary per video. Using yt-dlp format selector strings like `bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b` tells yt-dlp to find the best available match on any video.

### 4. Multi-client retry is essential on cloud IPs
YouTube serves different formats to different clients (`web`, `ios`, `android`, `mweb`). Cloud datacenter IPs often get blocked on the `web` client. Rotating through clients automatically recovers from these blocks.

### 5. `res.on("close")` kills processes too early
`res.on("close")` fires both when the response finishes normally AND when the client disconnects. Use `req.on("close")` instead, with a `!res.writableEnded` guard, so the process is only killed on actual early disconnection.

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| `yt-dlp: command not found` | Run `pip install yt-dlp` |
| `ffmpeg not found` | Run `sudo apt install ffmpeg` |
| MP3 is 0 bytes | Ensure ffmpeg is installed; yt-dlp needs it for audio conversion |
| 403 / bot detection on Render | Re-export fresh YouTube cookies and update `YOUTUBE_COOKIES` env var |
| Deno not found on Render | Ensure Dockerfile installs Deno with `DENO_INSTALL=/usr/local` |
| Download works locally but not on Render | Check cookies are valid and Deno is installed system-wide |
| `public/index.html` not found | Ensure build step copies `Frontend/dist` → `Backend/public` |

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| React 19 | UI framework |
| Vite | Frontend build tool |
| Axios | HTTP client |
| Express 5 | REST API |
| yt-dlp | YouTube extraction engine (system binary) |
| ffmpeg | Audio conversion + stream merging (system binary) |
| Deno | JS challenge solving for yt-dlp (system binary) |
| Sass | CSS preprocessing |
| express-rate-limit | API abuse protection |

---

## 🔗 Links

- **Live** → https://vidfetch-afmv.onrender.com
- **GitHub** → https://github.com/gc-MayankPun/VidFetch

---

**Made with ❤️ by gc_mayank (Mayank Pun)**
