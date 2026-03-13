import { IoMdTime } from "react-icons/io";
import "../styles/video.scss";

const Video = ({ video, downloadVideo }) => {
  return (
    <div className="videoCard">
      <img src={video.thumbnail} alt={video.title} className="thumbnail" />
      <div className="content">
        <h2 className="video-title">{video.title}</h2>
        <div className="duration">
          <span className="icon">
            <IoMdTime />
          </span>
          <span> {video.duration}</span>
        </div>

        <div className="formats">
          {video.formats && video.formats.length > 0 ? (
            video.formats.map((format) => (
              <button
                key={format.itag}
                className="downloadBtn"
                onClick={() => downloadVideo(format)}
              >
                Download {format.label}
              </button>
            ))
          ) : (
            <p>No downloadable formats available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Video;
