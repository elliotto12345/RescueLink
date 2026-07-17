import axios from "axios";
import { getApiBaseUrl } from "../constants/apiConfig";

const BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
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
    { timeout: 20000 },
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
