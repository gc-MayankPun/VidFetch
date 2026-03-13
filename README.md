# VidFetch - YouTube Video Downloader

A modern, full-stack YouTube video downloader application built with **React 19** and **Express.js**, designed to fetch YouTube videos and allow users to download the **best video+audio** format along with an optional **audio-only** format.

![React](https://img.shields.io/badge/React-v19-61dafb?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-90c53f?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Frontend Architecture](#-frontend-architecture)
- [Backend Architecture](#-backend-architecture)
- [Performance & Security](#-performance--security)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## ✨ Features

### Frontend

- **Modern UI Design**: Clean, sleek interface with smooth animations and transitions.
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices.
- **Real-time Video Info Fetching**: Instantly fetch video title, thumbnail, duration, and available formats.
- **Download Options**: Shows **best video+audio format** and an optional **audio-only format**.
- **Loading States**: Beautiful spinner and status indicators while fetching data.
- **Error Handling**: User-friendly alerts for invalid URLs or download failures.

### Backend

- **YouTube Integration**: Powered by `yt-dlp-exec` for reliable metadata and downloads.
- **Format Filtering**: Specifically filters for the highest quality combined and audio-only streams.
- **Rate Limiting**: Protects backend from abuse using `express-rate-limit`.
- **CORS Enabled**: Secure communication between frontend and backend.
- **Download Streaming**: Streams media directly to the browser without consuming local server storage.

---

## 🛠 Tech Stack

### Frontend

- **React 19.2** & **Vite 8.0**
- **Sass/SCSS** for styling
- **Axios** for HTTP requests
- **React Toastify** for notifications

### Backend

- **Node.js 16+** & **Express.js 5**
- **yt-dlp-exec** (YouTube downloader engine)
- **CORS** & **express-rate-limit**

---

## 📁 Project Structure

```text
YouTube Video Downloader/
├── Frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── home/ (Pages & SCSS)
│   │   │   ├── video/ (Components & SCSS)
│   │   │   └── shared/ (Global styles)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   └── routes/
│   ├── app.js
│   ├── server.js
│   └── package.json
└── README.md
```

---

## 🚀 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Backend Setup

1. Navigate to the Backend directory:

```bash
cd Backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file (optional, if needed for configuration):

```bash
cp .env.example .env
```

4. Start the development server:

```bash
npm run dev
```

The backend will be running on `http://localhost:3000`

### Frontend Setup

1. Navigate to the Frontend directory:

```bash
cd Frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## 🎯 Getting Started

1. **Clone the repository** (if applicable)
2. **Install both Frontend and Backend** using the steps above
3. **Start the Backend server** first (runs on port 3000)
4. **Start the Frontend server** (runs on port 5173)
5. **Open your browser** and navigate to `http://localhost:5173`
6. **Paste a YouTube URL** and click "Search" to fetch video details
7. **Select a format/quality** and download the video

---

## 🔌 API Endpoints

### Base URL

```
http://localhost:3000/api/videos
```

### Endpoints

#### 1. Fetch Video Information

```
POST /api/videos/info
```

**Request Body:**

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**

```json
{
  "message": "Video fetched successfully",
  "video": {
    "title": "Video Title",
    "thumbnail": "https://...",
    "duration": 300,
    "formats": [
      {
        "itag": "18",
        "label": "360p",
        "ext": "mp4",
        "type": "video+audio"
      },
      {
        "itag": "140",
        "label": "Audio - m4a",
        "ext": "m4a",
        "type": "audio-only"
      }
    ],
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
}
```

#### 2. Download Video

```
GET /download?url=<VIDEO_URL>&itag=<FORMAT_ITAG>
```

---

## 🎨 Frontend Architecture

### Component Structure

```
App.jsx (Root Component)
├── Home (Page)
│   ├── Input Group
│   │   ├── URL Input Field
│   │   └── Search Button
│   ├── Video Component
│   │   ├── Thumbnail Image
│   │   ├── Title
│   │   ├── Duration Badge
│   │   └── Download Button
│   └── Loading Spinner
```

### Features

- **Custom Hooks**: `useVideo()` manages video state and API calls
- **Service Layer**: Axios-based API communication
- **SCSS Modules**: Modular styling with SCSS
- **Responsive Design**: Mobile-first approach with media queries
- **Error Boundaries**: Graceful error handling

---

## 🔧 Backend Architecture

### Request Flow

```
Client Request
    ↓
Express Middleware (CORS, JSON)
    ↓
Rate Limiter
    ↓
Route Handler
    ↓
Video Controller
    ↓
yt-dlp-exec (YouTube Downloader)
    ↓
Response to Client
```

### Key Components

- **app.js**: Express configuration and middleware setup
- **video.routes.js**: API route definitions
- **video.controller.js**: Business logic for video operations
- **middlewares**: Rate limiting and request validation

---

## 📝 Usage Examples

### Example 1: Basic Video Download

1. Open the application in your browser
2. Paste this URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
3. Click "Search"
4. Wait for video information to load
5. Click "↓ Download" to start the download

### Example 2: Using the API Directly

```javascript
// Fetch video information
const response = await axios.post("http://localhost:3000/api/videos/info", {
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
});

console.log(response.data.video);
// Output: Video title, duration, formats, and thumbnail
```

---

## 🎯 Performance Optimizations

- **Lazy Loading**: Components load on demand
- **Debounced Requests**: API calls are optimized
- **Responsive Images**: Optimized thumbnail delivery
- **Caching**: Smart caching of video metadata
- **Rate Limiting**: Prevents server overload

---

## 🔒 Security Features

- **CORS Configuration**: Restricted to localhost for development
- **Rate Limiting**: Prevents abuse with express-rate-limit
- **Input Validation**: URL validation on frontend and backend
- **Error Handling**: Sensitive information not exposed to clients

---

## 📱 Responsive Design

The application is fully responsive with optimized layouts for:

- **Desktop** (1200px+): Full-featured interface with hover effects
- **Tablet** (768px - 1199px): Adapted layout
- **Mobile** (< 768px): Touch-optimized simplified interface

---

## 🚀 Building for Production

### Frontend Build

```bash
cd Frontend
npm run build
```

This creates a `dist/` folder with optimized production files.

### Backend Deployment

Install production dependencies and ensure environment variables are set correctly before deployment.

---

## 🐛 Troubleshooting

### Issue: CORS Error

**Solution**: Ensure backend is running on port 3000 and frontend on port 5173

### Issue: Video Not Found

**Solution**: Check if the YouTube URL is valid and publicly accessible

### Issue: Download Fails

**Solution**: Verify yt-dlp is properly installed via dependencies

---

## 📦 Dependencies Summary

| Package     | Version | Purpose           |
| ----------- | ------- | ----------------- |
| React       | 19.2.4  | UI Framework      |
| Vite        | 8.0.0   | Build Tool        |
| Axios       | 1.13.6  | HTTP Client       |
| Express     | 5.2.1   | REST API          |
| yt-dlp-exec | 1.0.2   | Video Download    |
| Sass        | 1.98.0  | CSS Preprocessing |

---

## 👨‍💻 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 🙌 Acknowledgments

- Built as a learning project for full-stack development
- YouTube API documentation
- Vite and React communities
- Express.js framework

---

**Made with ❤️ by gc_mayank (Mayank Pun)**

For more information or questions, please open an issue or contact the project maintainer.
