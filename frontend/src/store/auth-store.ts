import { create } from 'zustand';

import type { User } from '@/types/auth';

type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: User | null;
  setSession: (accessToken: string, user: User) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

/**
 * The access token lives only in memory (never localStorage) so it cannot
 * be read by an injected script that persists across reloads; the refresh
 * token is a separate httpOnly cookie the browser manages on our behalf.
 * A full page reload always re-derives this from a silent refresh call.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ status: 'authenticated', accessToken, user }),
  setAccessToken: (accessToken) => set({ status: 'authenticated', accessToken }),
  clearSession: () => set({ status: 'unauthenticated', accessToken: null, user: null }),
}));
