import { VideoProvider } from "./features/video/video.context";
import { ToastContainer, Zoom } from "react-toastify";
import Home from "./features/home/pages/Home";
import "./features/shared/styles/global.scss";

const App = () => {
  return (
    <VideoProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        transition={Zoom}
      />
      <Home />
    </VideoProvider>
  );
};

export default App;
