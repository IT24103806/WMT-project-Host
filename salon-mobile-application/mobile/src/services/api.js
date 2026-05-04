import axios from "axios";
import Constants from "expo-constants";
import { getToken } from "./authStorage";

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  ""
).replace(/\/+$/, "");

if (!API_URL) {
  throw new Error("Missing API URL. Set EXPO_PUBLIC_API_URL in mobile/.env.");
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000
});

api.interceptors.request.use(async (config) => {
  // Automatically attach JWT to every API request after login
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
