import { useAuthStore } from "@/store/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip attaching the access token and skip the refresh-and-retry dance on 401. */
  skipAuth?: boolean;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
    if (data?.error && typeof data.error === "object") {
      const firstKey = Object.keys(data.error)[0];
      const firstValue = data.error[firstKey];
      return Array.isArray(firstValue) ? String(firstValue[0]) : String(firstValue);
    }
    return response.statusText || "Request failed.";
  } catch {
    return response.statusText || "Request failed.";
  }
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Redeems the httpOnly refresh cookie for a new access token. Concurrent
 * callers share one in-flight request so a burst of 401s doesn't trigger a
 * burst of refresh calls (and therefore rotations).
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh/`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { access: string };
        useAuthStore.getState().setAccessToken(data.access);
        return data.access;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;

  const doFetch = () => {
    const token = useAuthStore.getState().accessToken;
    const finalHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...(headers ?? {}),
      ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch();

  if (response.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
