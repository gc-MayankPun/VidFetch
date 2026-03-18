import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Fetch video metadata (title, thumbnail, formats)
export async function fetchVideoInfo({ videoUrl }) {
  try {
    const response = await api.post("/api/videos/info", {
      // ← was /download, now /info
      url: videoUrl,
    });
    console.log(response.data)
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
}

// Stream MP4 or MP3 download via browser redirect
export function downloadFormat({ videoUrl, itag, type }) {
  const base = import.meta.env.VITE_API_URL;
  const params = new URLSearchParams({
    url: videoUrl,
    itag,
    type, // "mp4" or "mp3"
  });
  window.location.href = `${base}/api/videos/download?${params}`;
}

// Download thumbnail — proxied through our backend so browser gets a file save
export function downloadThumbnail({ thumbnailUrl }) {
  const base = import.meta.env.VITE_API_URL;
  const params = new URLSearchParams({ url: thumbnailUrl });
  window.location.href = `${base}/api/videos/thumbnail?${params}`;
}
