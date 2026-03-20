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

// Download format from metadata 
export function downloadFormat({ videoUrl, itag, type }) {
  const base = import.meta.env.VITE_API_URL;
  const params = new URLSearchParams({ url: videoUrl, itag, type });
  window.open(`${base}/api/videos/download?${params}`, "_blank");
}

// Download thumbnail
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