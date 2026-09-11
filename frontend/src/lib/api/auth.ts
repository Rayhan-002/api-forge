import { apiFetch } from "@/lib/api/client";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types/auth";

export function register(payload: RegisterPayload) {
  return apiFetch<AuthResponse>("/api/auth/register/", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });
}

export function login(payload: LoginPayload) {
  return apiFetch<AuthResponse>("/api/auth/login/", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });
}

export function logout() {
  return apiFetch<{ detail: string }>("/api/auth/logout/", { method: "POST" });
}

export function fetchMe() {
  return apiFetch<User>("/api/auth/me/");
}
