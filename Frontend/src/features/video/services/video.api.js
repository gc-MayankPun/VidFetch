import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Fetch video metadata (title, thumbnail, formats)
export async function fetchVideoInfo({ videoUrl }) {
  console.log(import.meta.env.VITE_API_URL)
  try {
    const response = await api.post("/api/videos/info", {
      url: videoUrl,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
}

export async function downloadFormat({ videoUrl, itag, type }) {
  const base = import.meta.env.VITE_API_URL;
  const params = new URLSearchParams({ url: videoUrl, itag, type });

  try {
    if (type === "mp4") {
      // MP4: Get direct URL from backend, then download via blob
      const response = await api.get(`/api/videos/download?${params}`);
      const { directUrl, title, ext } = response.data;

      // Fetch the direct URL as a blob and download it
      const videoResponse = await fetch(directUrl);
      if (!videoResponse.ok) throw new Error("Failed to fetch video");
      
      const blob = await videoResponse.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.${ext}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      // MP3: Stream from backend (needs ffmpeg conversion)
      const a = document.createElement("a");
      a.href = `${base}/api/videos/download?${params}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    throw err.response?.data || { message: "Failed to download file" };
  }
}

export function downloadThumbnail({ thumbnailUrl }) {
  const base = import.meta.env.VITE_API_URL;
  const params = new URLSearchParams({ url: thumbnailUrl });

  const a = document.createElement("a");
  a.href = `${base}/api/videos/thumbnail?${params}`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}