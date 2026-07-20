import { Platform } from "react-native";

export const RENDER_URL = "https://rescuelink-backend-0q2e.onrender.com";

function useRenderInDev() {
  const flag = process.env.EXPO_PUBLIC_USE_RENDER;
  return flag === "1" || flag === "true";
}

export function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (typeof __DEV__ !== "undefined" && __DEV__ && !useRenderInDev()) {
    return Platform.OS === "android"
      ? "http://10.0.2.2:5000"
      : "http://localhost:5000";
  }

  return RENDER_URL;
}
