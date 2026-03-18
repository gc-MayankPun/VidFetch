import { IoMdTime } from "react-icons/io";
import { MdOutlineFileDownload, MdOutlineImage } from "react-icons/md";
import "../styles/video.scss";

// Icon map for format types
const FORMAT_ICONS = {
  mp4: "🎬",
  mp3: "🎧",
};

const Video = ({ video, handleDownload, handleThumbnailDownload }) => {
  return (
    <div className="videoCard">
      <div className="thumbnailWrapper">
        <img src={video.thumbnail} alt={video.title} className="thumbnail" />
      </div>

      <div className="content">
        <h2 className="video-title">{video.title}</h2>

        <div className="duration">
          <span className="icon">
            <IoMdTime />
          </span>
          <span>{video.duration}</span>
        </div>

        <div className="formats">
          {video.formats && video.formats.length > 0 ? (
            video.formats.map((format) => (
              <button
                key={format.itag}
                className={`downloadBtn downloadBtn--${format.type}`}
                onClick={() => handleDownload(format)}
              >
                <MdOutlineFileDownload size={18} />
                {FORMAT_ICONS[format.type]} {format.label}
              </button>
            ))
          ) : (
            <p>No downloadable formats available</p>
          )}
          <button 
            className={`downloadBtn`}
            onClick={handleThumbnailDownload}
            title="Download thumbnail"
          >
            <MdOutlineImage size={16} />
            Save Thumbnail
          </button>
        </div>
      </div>
    </div>
  );
};

export default Video;
