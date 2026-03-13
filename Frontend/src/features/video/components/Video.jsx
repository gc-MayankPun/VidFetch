import '../styles/video.scss';

const Video = ({ video, downloadVideoFormat }) => {
  return (
    <div className="videoCard">
      <img
        src={video.thumbnail}
        alt={video.title}
        className="thumbnail"
      />
      <div className="content">
        <h2 className="title">{video.title}</h2>
        <span className="duration">⏱ {video.duration}</span>
        <button
          className="downloadBtn"
          onClick={() => downloadVideoFormat(video.formats[0])}
        >
          ↓ Download
        </button>
      </div>
    </div>
  );
};

export default Video;
