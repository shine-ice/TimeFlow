import axios, { AxiosHeaders, type AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import type { ApiResponse } from "@/types/api.type";

export interface RequestError {
  message: string;
  status?: number;
  code?: string;
  cause?: unknown;
}

export function normalizeRequestError(error: unknown): RequestError {
  if (error && typeof error === "object") {
    const value = error as {
      message?: unknown;
      code?: unknown;
      response?: {
        status?: unknown;
        data?: { message?: unknown; code?: unknown };
      };
    };
    const responseMessage = value.response?.data?.message;
    const message =
      (typeof responseMessage === "string" && responseMessage) ||
      (typeof value.message === "string" && value.message) ||
      "Request failed, please try again later";
    return {
      message,
      status:
        typeof value.response?.status === "number"
          ? value.response.status
          : undefined,
      code:
        (typeof value.response?.data?.code === "string" &&
          value.response.data.code) ||
        (typeof value.code === "string" ? value.code : undefined),
      cause: error,
    };
  }
  return {
    message:
      typeof error === "string"
        ? error
        : "Request failed, please try again later",
    cause: error,
  };
}

declare module "axios" {
  interface AxiosRequestConfig {
    __retried?: boolean;
  }
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api",
  timeout: 15000,
});

let refreshPromise: Promise<void> | null = null;

http.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse<unknown> | undefined;
    if (res && typeof res === "object" && "code" in res) {
      if (res.code !== "SUCCESS") {
        return Promise.reject({
          response: { ...response, data: res },
          message: res.message,
        });
      }
      return res.data;
    }
    return response.data;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error;

    const original = error.config;
    const auth = useAuthStore();
    const isRefreshRequest = original?.url?.includes("/auth/refresh");

    if (
      error.response?.status !== 401 ||
      !original ||
      !auth.refreshToken ||
      original.__retried ||
      isRefreshRequest
    ) {
      throw error;
    }

    original.__retried = true;
    try {
      if (!refreshPromise) {
        refreshPromise = auth.refresh().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      original.headers = AxiosHeaders.from(original.headers);
      original.headers.set("Authorization", `Bearer ${auth.accessToken}`);
      return http.request(original as AxiosRequestConfig);
    } catch (refreshError) {
      auth.clearAuth();
      throw refreshError;
    }
  },
);

export default http;
