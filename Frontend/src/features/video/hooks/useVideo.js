import { useContext } from "react";
import { download } from "../services/video.api";
import { VideoContext } from "../video.context";
import { formatDuration } from "../utils/video.utils";
import { toast } from "react-toastify";

export const useVideo = () => {
  const context = useContext(VideoContext);
  const { video, setVideo, loading, setLoading } = context;

  async function downloadVideo({ videoUrl }) {
    setLoading(true);
    try {
      const response = await download({ videoUrl });

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

  async function downloadVideoFormat(format) {
    const downloadUrl =
      "http://localhost:3000/api/videos/download?url=" +
      encodeURIComponent(format.url);

    window.location.href = downloadUrl;
  }

  const clearVideo = () => {
    setVideo(null);
  };

  return { loading, video, downloadVideo, downloadVideoFormat, clearVideo };
};
