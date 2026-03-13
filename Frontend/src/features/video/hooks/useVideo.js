import { useContext } from "react";
import { download } from "../services/video.api";
import { VideoContext } from "../video.context";
import { formatDuration } from "../utils/video.utils";
import { toast } from "react-toastify";

export const useVideo = () => {
  const context = useContext(VideoContext);
  const { video, setVideo, loading, setLoading } = context;

  // Fetch video info from backend
  async function fetchInfo({ videoUrl }) {
    setLoading(true);
    try {
      const response = await download({ videoUrl });
      console.log(response);

      setVideo({
        ...response.video,
        duration: formatDuration(response.video.duration),
      });

      toast.success(response.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const downloadVideo = (format) => {
    if (!video?.url) return;

    const downloadUrl = `${import.meta.env.VITE_API_URL}/api/videos/download?url=${encodeURIComponent(video.url)}&itag=${format.itag}`;
    window.location.href = downloadUrl;
  };

  const clearVideo = () => {
    setVideo(null);
  };

  return { loading, video, fetchInfo, downloadVideo, clearVideo };
};
