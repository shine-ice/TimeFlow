import http from "./http";

function postData<T>(url: string, payload?: unknown): Promise<T> {
  return http.post<T>(url, payload) as unknown as Promise<T>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  deviceId: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export const AuthAPI = {
  register(payload: RegisterPayload) {
    return postData<{ user: AuthUser }>("/auth/register", payload);
  },
  login(payload: LoginPayload) {
    return postData<{ tokens: AuthTokens; user: AuthUser }>(
      "/auth/login",
      payload,
    );
  },
  refresh(payload: { refreshToken: string }) {
    return postData<{ tokens: AuthTokens }>("/auth/refresh", payload);
  },
  logout() {
    return postData<{ ok: boolean }>("/auth/logout");
  },
};
