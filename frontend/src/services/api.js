import axios from "axios";

const BASE_URL = "https://rescuelink-production-cb78.up.railway.app";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export const createRequest = (data) => api.post("/api/requests", data);
export const getRequests = () => api.get("/api/requests");
export const updateRequestStatus = (id, data) =>
  api.put(`/api/requests/${id}/status`, data);

export const getNearbyMechanics = (lat, lon) =>
  api.get(`/api/mechanics/nearby?latitude=${lat}&longitude=${lon}`);
export const getMechanics = () => api.get("/api/mechanics");

export const sendOTP = (email) => api.post("/api/otp/send", { email });
export const verifyOTP = (email, otp) =>
  api.post("/api/otp/verify", { email, otp });

export default api;
