import { useState } from "react";
import { useVideo } from "../../video/hooks/useVideo";
import Video from "../../video/components/Video";
import "../styles/home.scss";

const Home = () => {
  const { loading, video, fetchInfo, downloadVideo, clearVideo } =
    useVideo();
  const [link, setLink] = useState("");

  const handleSearch = () => {
    clearVideo();
    if (link.trim()) {
      fetchInfo({ videoUrl: link });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && link.trim() && !loading) {
      handleSearch();
    }
  };

  return (
    <main className="homeContainer">
      <div className="header">
        <h1 className="title">YouTube Video Downloader</h1>
        <p className="subtitle">
          Paste a YouTube link and download your video instantly
        </p>
      </div>

      <div className="searchSection">
        <div className="inputGroup">
          <input
            className="input"
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={handleKeyPress}
            value={link}
            type="text"
            name="url"
            id="url"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <button
            className="searchBtn"
            onClick={handleSearch}
            disabled={loading || !link.trim()}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {loading && <div className="loadingSpinner"></div>}

      {video && (
        <div className="videoContainer">
          <Video video={video} downloadVideo={downloadVideo} />
        </div>
      )}
    </main>
  );
};

export default Home;
