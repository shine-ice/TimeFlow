import { defineStore } from "pinia";
import { AuthAPI, type AuthTokens, type AuthUser, type RegisterPayload } from "@/api/auth.api";

const STORAGE_KEY = "tf-auth";

function isAuthTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== "object") return false;
  const tokens = value as Partial<AuthTokens>;
  return typeof tokens.accessToken === "string" && typeof tokens.refreshToken === "string";
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<AuthUser>;
  return typeof user.id === "string" && typeof user.name === "string" && typeof user.email === "string";
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: "" as string,
    refreshToken: "" as string,
    user: null as AuthUser | null,
    deviceId: `web-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
  }),
  actions: {
    restoreFromStorage() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const data: unknown = JSON.parse(raw);
        if (
          !data ||
          typeof data !== "object" ||
          !isAuthTokens(data) ||
          !isAuthUser((data as { user?: unknown }).user)
        ) {
          this.clearAuth();
          return;
        }
        const restored = data as { accessToken: string; refreshToken: string; user: AuthUser };
        this.accessToken = restored.accessToken;
        this.refreshToken = restored.refreshToken;
        this.user = restored.user;
      } catch {
        this.clearAuth();
      }
    },
    persistToStorage() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          user: this.user,
        }),
      );
    },
    setTokens(tokens: AuthTokens) {
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.persistToStorage();
    },
    clearAuth() {
      this.accessToken = "";
      this.refreshToken = "";
      this.user = null;
      localStorage.removeItem(STORAGE_KEY);
    },
    async login(email: string, password: string) {
      const res = await AuthAPI.login({ email, password, deviceId: this.deviceId });
      this.setTokens(res.tokens);
      this.user = res.user;
      this.persistToStorage();
    },
    async register(payload: RegisterPayload) {
      await AuthAPI.register(payload);
      await this.login(payload.email, payload.password);
    },
    async refresh() {
      const res = await AuthAPI.refresh({ refreshToken: this.refreshToken });
      this.setTokens(res.tokens);
    },
    async logout() {
      try {
        await AuthAPI.logout();
      } finally {
        this.clearAuth();
      }
    },
  },
});
