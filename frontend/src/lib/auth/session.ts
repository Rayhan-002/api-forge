import { refreshAccessToken } from "@/lib/api/client";
import { fetchMe } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";

/**
 * Runs once on app load: exchanges the httpOnly refresh cookie (if any) for
 * a fresh access token and loads the current user. There is no server-side
 * session to hydrate from, since the refresh cookie belongs to the Django
 * API's origin, not this Next.js app's.
 */
export async function bootstrapSession(): Promise<void> {
  const token = await refreshAccessToken();
  if (!token) {
    useAuthStore.getState().clearSession();
    return;
  }

  try {
    const user = await fetchMe();
    useAuthStore.getState().setSession(token, user);
  } catch {
    useAuthStore.getState().clearSession();
  }
}
