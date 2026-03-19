import { useState } from "react";
import { useVideo } from "../../video/hooks/useVideo";
import Video from "../../video/components/Video";
import { MdLink, MdVideoLibrary, MdAudiotrack, MdImage, MdSpeed } from "react-icons/md";
import "../styles/home.scss";

const Home = () => {
  const { loading, video, fetchInfo, handleDownload, handleThumbnailDownload, clearVideo } = useVideo();
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

      {/* Nav */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-dot" />
          VidFetch
        </div>
        <span className="nav-badge">Free · No Signup</span>
      </nav>

      {/* Hero */}
      <section className="hero">
        <p className="heroEyebrow">YouTube Downloader</p>
        <h1 className="heroTitle">
          Grab any video.<br />
          <span className="accent-word">Keep it forever.</span>
        </h1>
        <p className="heroSub">
          Paste a YouTube link and download it as MP4 video or audio.
          No accounts, no queues, no limits.
        </p>

        {/* Search */}
        <div className="searchSection">
          <div className="inputGroup">
            <div className="inputWrapper">
              <span className="inputIcon">
                <MdLink />
              </span>
              <input
                className="input"
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={handleKeyPress}
                value={link}
                type="text"
                name="url"
                id="url"
                placeholder="https://www.youtube.com/watch?v=..."
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <button
              className="searchBtn"
              onClick={handleSearch}
              disabled={loading || !link.trim()}
            >
              {loading ? "Fetching..." : "Fetch Video"}
            </button>
          </div>
          <p className="inputHint">Supports youtube.com, youtu.be and Shorts links</p>
        </div>
      </section>

      {/* Feature cards */}
      {!video && !loading && (
        <section className="featuresSection">
          <div className="featureCard">
            <div className="featureIcon">
              <MdVideoLibrary />
            </div>
            <div className="featureText">
              <h3>MP4 Video</h3>
              <p>Download in the best available quality up to 1080p</p>
            </div>
          </div>
          <div className="featureCard">
            <div className="featureIcon featureIcon--audio">
              <MdAudiotrack />
            </div>
            <div className="featureText">
              <h3>Audio Only</h3>
              <p>Extract just the audio as a WebM audio file</p>
            </div>
          </div>
          <div className="featureCard">
            <div className="featureIcon featureIcon--image">
              <MdImage />
            </div>
            <div className="featureText">
              <h3>Thumbnail</h3>
              <p>Save the video thumbnail as a high-res image</p>
            </div>
          </div>
          <div className="featureCard">
            <div className="featureIcon featureIcon--speed">
              <MdSpeed />
            </div>
            <div className="featureText">
              <h3>Direct Stream</h3>
              <p>Files stream straight to your device, nothing stored</p>
            </div>
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="loadingState">
          <div className="loadingRing" />
          <span className="loadingText">Fetching video info</span>
        </div>
      )}

      {/* Video result */}
      {video && (
        <div className="videoContainer">
          <Video
            video={video}
            handleDownload={handleDownload}
            handleThumbnailDownload={handleThumbnailDownload}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>VidFetch — Built for personal use. Respect copyright laws.</p>
      </footer>

    </main>
  );
};

export default Home;