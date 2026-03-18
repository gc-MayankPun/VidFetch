import { useContext } from "react";
import { fetchVideoInfo, downloadFormat, downloadThumbnail } from "../services/video.api";
import { VideoContext } from "../video.context";
import { formatDuration } from "../utils/video.utils";
import { toast } from "react-toastify";

export const useVideo = () => {
  const { video, setVideo, loading, setLoading } = useContext(VideoContext);

  // Fetch video info from backend
  async function fetchInfo({ videoUrl }) {
    setLoading(true);
    setVideo(null);
    try {
      const response = await fetchVideoInfo({ videoUrl });   // ← was calling download()
      setVideo({
        ...response.video,
        duration: formatDuration(response.video.duration),
      });
      toast.success(response.message);
    } catch (err) {
      toast.error(err.message || "Failed to fetch video");
    } finally {
      setLoading(false);
    }
  }

  // Download MP4 or MP3
  async function handleDownload(format) {
  if (!video?.url) return;
  try {
    await downloadFormat({
      videoUrl: video.url,
      itag: format.itag,
      type: format.type,
    });
  } catch (err) {
    toast.error(err.message || "Download failed. Please try again.");
  }
}
  // Download thumbnail
  function handleThumbnailDownload() {
    if (!video?.thumbnail) return;
    downloadThumbnail({ thumbnailUrl: video.thumbnail });
  }

  const clearVideo = () => setVideo(null);

  return { loading, video, fetchInfo, handleDownload, handleThumbnailDownload, clearVideo };
};