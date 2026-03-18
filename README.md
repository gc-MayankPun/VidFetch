# VidFetch — YouTube Downloader

A full-stack YouTube downloader built with **React 19** and **Express.js**, powered by **yt-dlp**. Paste a YouTube URL to download the video as MP4, extract audio as MP3, or save the thumbnail.

![React](https://img.shields.io/badge/React-v19-61dafb?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express%205-90c53f?logo=node.js)
![License](https://img.shields.io/badge/License-ISC-green)

---

## ✨ Features

- **MP4 Download** — best available quality, DASH streams merged automatically via ffmpeg
- **MP3 Download** — audio extracted and converted to 192kbps MP3
- **Thumbnail Download** — highest resolution thumbnail saved as JPG/PNG
- **Bot bypass** — Chrome user-agent spoofing + YouTube web player client to avoid datacenter IP blocks
- **SPA served by backend** — single Render deployment, no separate frontend hosting needed

---

## 🛠 Tech Stack

### Frontend
- **React 19** & **Vite**
- **Sass/SCSS** for styling
- **Axios** for API calls
- **React Toastify** for notifications

### Backend
- **Node.js** & **Express.js 5**
- **yt-dlp** (system binary, installed via pip)
- **ffmpeg** for MP3 conversion and stream merging
- **CORS** & **express-rate-limit**

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
└── README.md
```

---

## 🚀 Local Setup

### Prerequisites

- Node.js v18+
- Python + pip (`sudo pacman -S python` on Arch)
- yt-dlp (`sudo pacman -S yt-dlp` on Arch, or `pip install yt-dlp`)
- ffmpeg (`sudo pacman -S ffmpeg` on Arch)

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
    "thumbnail": "https://...",
    "duration": 212,
    "formats": [
      { "itag": "137+140", "label": "1080p MP4", "ext": "mp4", "type": "mp4" },
      { "itag": "140",     "label": "MP3 Audio", "ext": "mp3", "type": "mp3" }
    ],
    "url": "https://www.youtube.com/watch?v=..."
  }
}
```

### `GET /download?url=&itag=&type=`
Stream download. `type` is `mp4` or `mp3`.

### `GET /thumbnail?url=`
Proxies and downloads the thumbnail image.

---

## 🔧 Backend Architecture

```
POST /info
    → yt-dlp --dump-json      (fetch metadata)
    → filter & rank formats
    → return MP4 + MP3 options

GET /download (mp4)
    → yt-dlp -f <itag> -o -   (stream stdout → response)

GET /download (mp3)
    → yt-dlp -x --audio-format mp3 -o <tmpfile>
    → res.sendFile → cleanup

GET /thumbnail
    → fetch(thumbnailUrl) → proxy to browser
```

---

## ☁️ Render Deployment

### Build command
```bash
npm install && cp -r Frontend/dist public && pip install -U yt-dlp
```
> This assumes the frontend is pre-built and committed to `Backend/Frontend/dist/`.
> To build on Render instead: `npm install && cd ../Frontend && npm install && npm run build && cp -r dist ../Backend/public && cd ../Backend && pip install -U yt-dlp`

### Environment variables
| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `VITE_API_URL` | `https://your-app.onrender.com` |

### Note on YouTube blocking
Render (and most cloud providers) use datacenter IPs which YouTube flags as bots. The app uses Chrome user-agent spoofing and the YouTube web player client to mitigate this, but it may still fail on some videos. It works reliably on home/residential IPs.

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| `yt-dlp: command not found` | Run `pip install yt-dlp` or `sudo pacman -S yt-dlp` |
| `ffmpeg not found` | Run `sudo pacman -S ffmpeg` (Arch) or `apt install ffmpeg` |
| 403 on Render | YouTube is blocking the datacenter IP — works fine locally |
| MP3 not appearing | Check ffmpeg is installed; yt-dlp needs it for audio conversion |
| `public/index.html` not found | Ensure build command copies `Frontend/dist` → `Backend/public` |

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| React 19 | UI framework |
| Vite | Frontend build tool |
| Axios | HTTP client |
| Express 5 | REST API |
| yt-dlp | YouTube download engine (system binary) |
| ffmpeg | Audio conversion + stream merging |
| Sass | CSS preprocessing |
| express-rate-limit | API abuse protection |

---

**Made with ❤️ by gc_mayank (Mayank Pun)**
