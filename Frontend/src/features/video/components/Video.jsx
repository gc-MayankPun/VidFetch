import { IoMdTime } from "react-icons/io";
import { MdOutlineFileDownload, MdOutlineImage } from "react-icons/md";
import "../styles/video.scss";

const FORMAT_ICONS = {
  mp4: "🎬",
  mp3: "🎧",
};

const FORMAT_LABELS = {
  mp4: "Download MP4",
  mp3: "Download Audio",
};

const Video = ({ video, handleDownload, handleThumbnailDownload }) => {
  return (
    <div className="videoCard">

      {/* Thumbnail */}
      <div className="thumbnailWrapper">
        <img src={video.thumbnail} alt={video.title} className="thumbnail" />
        <div className="thumbnailOverlay" />
      </div>

      {/* Content */}
      <div className="content">

        <div className="contentMeta">
          <span className="metaTag">YouTube</span>
          <div className="duration">
            <span className="icon"><IoMdTime /></span>
            <span>{video.duration}</span>
          </div>
        </div>

        <h2 className="video-title">{video.title}</h2>

        <p className="formatsLabel">Choose format</p>

        <div className="formats">
          {video.formats && video.formats.length > 0 ? (
            <>
              {video.formats.map((format) => (
                <button
                  key={format.itag}
                  className={`downloadBtn downloadBtn--${format.type}`}
                  onClick={() => handleDownload(format)}
                >
                  <MdOutlineFileDownload size={16} />
                  {FORMAT_ICONS[format.type]}{" "}
                  {FORMAT_LABELS[format.type] || format.label}
                </button>
              ))}
              <button
                className="downloadBtn"
                onClick={handleThumbnailDownload}
                title="Download thumbnail"
              >
                <MdOutlineImage size={15} />
                Save Thumbnail
              </button>
            </>
          ) : (
            <p className="noFormats">No downloadable formats available</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default Video;