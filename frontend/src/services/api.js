import axios from "axios";
import { getApiBaseUrl } from "../constants/apiConfig";

const api = axios.create({
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export const createRequest = (data) => api.post("/api/requests", data);
export const getRequests = () => api.get("/api/requests");
export const updateRequestStatus = (id, data) =>
  api.put(`/api/requests/${id}/status`, data);

export const getNearbyMechanics = (lat, lon) =>
  api.get(`/api/mechanics/nearby?latitude=${lat}&longitude=${lon}`);
export const getMechanics = () => api.get("/api/mechanics");

export const sendOTP = (email, purpose = "register", uid = null) =>
  api.post(
    "/api/otp/send",
    {
      email: email.trim().toLowerCase(),
      purpose,
      ...(uid ? { uid } : {}),
    },
    { timeout: 60000 }, // increased to 60 seconds
  );

export const verifyOTP = (email, otp, purpose = "register", uid = null) =>
  api.post(
    "/api/otp/verify",
    {
      email: email.trim().toLowerCase(),
      otp: String(otp).trim(),
      purpose,
      ...(uid ? { uid } : {}),
    },
    { timeout: 20000 },
  );

export default api;
