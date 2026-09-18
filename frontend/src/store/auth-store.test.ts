import { beforeEach, describe, expect, it } from 'vitest';

import type { User } from '@/types/auth';
import { useAuthStore } from './auth-store';

const user: User = { id: 'u1', email: 'ada@example.com', date_joined: '2026-01-01T00:00:00Z' };

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'idle', accessToken: null, user: null });
  });

  it('starts idle with no session', () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe('idle');
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setSession stores the token and user and marks authenticated', () => {
    useAuthStore.getState().setSession('token-123', user);

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.accessToken).toBe('token-123');
    expect(state.user).toEqual(user);
  });

  it('setAccessToken replaces the token without touching the stored user', () => {
    useAuthStore.getState().setSession('token-123', user);
    useAuthStore.getState().setAccessToken('token-456');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token-456');
    expect(state.user).toEqual(user);
    expect(state.status).toBe('authenticated');
  });

  it('clearSession wipes the token, user, and marks unauthenticated', () => {
    useAuthStore.getState().setSession('token-123', user);
    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });
});
