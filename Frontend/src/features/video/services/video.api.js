import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api/videos",
  withCredentials: true,
});

export async function download({ videoUrl }) {
  try {
    const response = await api.post("/download", {
      url: videoUrl,
    });

    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Something went wrong" };
  }
}
