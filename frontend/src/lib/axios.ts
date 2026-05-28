import axios from "axios";
import { getBackendUrl } from "./utils";

export const api = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});
