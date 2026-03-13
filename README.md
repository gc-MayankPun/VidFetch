# VidFetch - YouTube Video Downloader

A modern, full-stack YouTube video downloader application built with React and Express.js. Features a sleek UI with smooth animations and a robust backend for downloading videos from YouTube with multiple format and quality options.

![VidFetch Demo](https://img.shields.io/badge/React-v19-61dafb?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-90c53f?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### Frontend
- **Modern UI Design**: Clean, sleek interface with smooth animations and transitions
- **Responsive Layout**: Fully optimized for desktop and mobile devices
- **Real-time Search**: Fetch video information instantly from YouTube
- **Multiple Format Support**: Download videos in various formats and quality options
- **Loading States**: Beautiful spinner and status indicators
- **Error Handling**: User-friendly error messages and validation

### Backend
- **YouTube Integration**: Seamless video fetching using `yt-dlp-exec`
- **Rate Limiting**: Built-in protection against abuse with express-rate-limit
- **CORS Support**: Configured for secure cross-origin requests
- **Video Metadata**: Retrieve title, duration, thumbnail, and available formats
- **Download Management**: Support for multiple quality tiers and formats

---

## 🛠 Tech Stack

### Frontend
- **React 19.2** - UI Framework
- **Vite 8.0** - Build tool and dev server
- **Sass/SCSS** - Advanced styling with variables and mixins
- **Axios** - HTTP client for API requests
- **React Toastify** - Toast notifications
- **ESLint** - Code quality and linting

### Backend
- **Node.js** - Runtime environment
- **Express.js** - REST API framework
- **yt-dlp-exec** - YouTube video downloading library
- **CORS** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting middleware

---

## 📁 Project Structure

```
YouTube Video Downloader/
├── Frontend/
│   ├── public/
│   ├── src/
│   │   ├── features/
│   │   │   ├── home/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── Home.jsx
│   │   │   │   │   └── home.scss
│   │   │   │   └── styles/
│   │   │   ├── video/
│   │   │   │   ├── components/
│   │   │   │   │   ├── Video.jsx
│   │   │   │   │   └── video.scss
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   └── styles/
│   │   │   └── shared/
│   │   │       └── styles/
│   │   │           └── global.scss
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
│
├── Backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── controllers/
│   │   │   └── video.controller.js
│   │   ├── middlewares/
│   │   └── routes/
│   │       └── video.routes.js
│   ├── server.js
│   ├── .env
│   ├── package.json
│   └── node_modules/
│
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
  "success": true,
  "video": {
    "id": "dQw4w9WgXcQ",
    "title": "Video Title",
    "duration": "4:26",
    "thumbnail": "https://...",
    "formats": [
      {
        "format_id": "22",
        "ext": "mp4",
        "resolution": "720p",
        "filesize": "22.5MB"
      },
      ...
    ]
  }
}
```

#### 2. Download Video
```
POST /api/videos/download
```

**Request Body:**
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "formatId": "22"
}
```

**Response:**
```json
{
  "success": true,
  "downloadUrl": "https://example.com/download/video.mp4",
  "filename": "video-title.mp4"
}
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
const response = await axios.post('http://localhost:3000/api/videos/info', {
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
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

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.4 | UI Framework |
| Vite | 8.0.0 | Build Tool |
| Axios | 1.13.6 | HTTP Client |
| Express | 5.2.1 | REST API |
| yt-dlp-exec | 1.0.2 | Video Download |
| Sass | 1.98.0 | CSS Preprocessing |

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

**Made with ❤️ by Mayank | Sheriyans Coding School**

For more information or questions, please open an issue or contact the project maintainer.
