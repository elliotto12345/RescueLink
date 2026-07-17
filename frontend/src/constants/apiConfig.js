import { Platform } from "react-native";

/** Update after Railway deploy, or set EXPO_PUBLIC_API_URL in frontend/.env */
export const RAILWAY_URL =
  "https://rescuelink-production-cb78.up.railway.app";

function useRailwayInDev() {
  const flag = process.env.EXPO_PUBLIC_USE_RAILWAY;
  return flag === "1" || flag === "true";
}

export function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (typeof __DEV__ !== "undefined" && __DEV__ && !useRailwayInDev()) {
    return Platform.OS === "android"
      ? "http://10.0.2.2:5000"
      : "http://localhost:5000";
  }

  return RAILWAY_URL;
}
