import { createContext, useState } from "react";

export const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <VideoContext.Provider value={{ video, setVideo, loading, setLoading }}>
      {children}
    </VideoContext.Provider>
  );
};
