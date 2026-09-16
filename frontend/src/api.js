import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

export const fileUrl = (p) => {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  const base = (import.meta.env.VITE_SOCKET_URL || "http://localhost:5000").replace(/[/]+$/, "");
  return base + (p.startsWith("/") ? p : "/" + p);
};

export default api;
