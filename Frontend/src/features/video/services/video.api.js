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
      // ← was /download, now /info
      url: videoUrl,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
}

// Stream MP4 or MP3 download via browser redirect
// export function downloadFormat({ videoUrl, itag, type }) {
//   const base = import.meta.env.VITE_API_URL;
//   const params = new URLSearchParams({
//     url: videoUrl,
//     itag,
//     type, // "mp4" or "mp3"
//   });
//   window.location.href = `${base}/api/videos/download?${params}`;
// }

// // Download thumbnail — proxied through our backend so browser gets a file save
// export function downloadThumbnail({ thumbnailUrl }) {
//   const base = import.meta.env.VITE_API_URL;
//   const params = new URLSearchParams({ url: thumbnailUrl });
//   window.location.href = `${base}/api/videos/thumbnail?${params}`;
// }

export async function downloadFormat({ videoUrl, itag, type }) {
  const base = import.meta.env.VITE_API_URL;
  const params = new URLSearchParams({ url: videoUrl, itag, type });

  if (type === "mp4") {
    // Option 3: ask backend to resolve the direct CDN URL, browser downloads it
    try {
      const response = await api.get(`/api/videos/download?${params}`);
      const { directUrl, title, ext } = response.data;

      const a = document.createElement("a");
      a.href = directUrl;
      a.download = `${title}.${ext}`;
      a.target = "_blank"; // fallback if CORS blocks download attr
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      throw err.response?.data || { message: "Failed to get download link" };
    }
  } else {
    // MP3: still streams from backend (needs ffmpeg conversion)
    const a = document.createElement("a");
    a.href = `${base}/api/videos/download?${params}`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
