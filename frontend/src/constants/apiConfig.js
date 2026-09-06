import { NativeModules, Platform } from "react-native";

export const RENDER_URL = "https://rescuelink-backend-0q2e.onrender.com";
const DEV_API_PORT = process.env.EXPO_PUBLIC_API_PORT || "5000";

function useRenderInDev() {
  const flag = process.env.EXPO_PUBLIC_USE_RENDER;
  return flag === "1" || flag === "true";
}

function isLoopback(host) {
  return (
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host === "::1"
  );
}

function extractHost(value) {
  if (!value) return null;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const ipv4 = text.match(/(?:^|[^\d])(\d{1,3}(?:\.\d{1,3}){3})(?:$|[^\d])/);
  if (ipv4?.[1] && !isLoopback(ipv4[1])) return ipv4[1];

  const schemeHost = text.match(
    /(?:exp|exps|http|https|ws|wss):\/\/([^/:?#]+)/i,
  );
  const host = schemeHost?.[1];
  if (host && !isLoopback(host)) return host;
  return null;
}

function getExpoHostCandidates() {
  try {
    const Constants = require("expo-constants").default;
    return [
      Constants.expoConfig?.hostUri,
      Constants.expoGoConfig?.debuggerHost,
      Constants.linkingUri,
      Constants.experienceUrl,
      Constants.debuggerHost,
      Constants.manifest2?.extra?.expoGo?.debuggerHost,
      Constants.manifest?.debuggerHost,
    ];
  } catch {
    return [];
  }
}

function getDevHost() {
  const configured = process.env.EXPO_PUBLIC_DEV_HOST;
  if (configured && !isLoopback(configured)) {
    return configured.replace(/^https?:\/\//, "").split(":")[0];
  }

  const modules = NativeModules || {};
  const candidates = [
    ...getExpoHostCandidates(),
    modules.SourceCode?.scriptURL,
    modules.ExponentConstants?.linkingUri,
    modules.ExponentConstants?.experienceUrl,
    modules.ExponentConstants?.manifest,
    modules.ExponentConstants?.manifestString,
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host) return host;
  }

  return null;
}

export function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (typeof __DEV__ !== "undefined" && __DEV__ && !useRenderInDev()) {
    const host = getDevHost();
    if (host) {
      return `http://${host}:${DEV_API_PORT}`;
    }
    if (Platform.OS === "android") {
      return `http://10.0.2.2:${DEV_API_PORT}`;
    }
    if (Platform.OS === "web") {
      return `http://localhost:${DEV_API_PORT}`;
    }
    return `http://localhost:${DEV_API_PORT}`;
  }

  return RENDER_URL;
}
