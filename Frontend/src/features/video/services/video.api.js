import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export async function download({ videoUrl }) {
  try {
    const response = await api.post("/api/videos/download", {
      url: videoUrl,
    });

    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Something went wrong" };
  }
}
