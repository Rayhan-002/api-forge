import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/store/auth-store';
import { apiFetch, ApiError } from './client';

function jsonResponse(status: number, body: unknown, ok = status < 300): Response {
  return { ok, status, json: async () => body, statusText: '' } as Response;
}

describe('apiFetch — silent refresh-on-401', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.setState({ status: 'idle', accessToken: null, user: null });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches the Authorization header when an access token is present', async () => {
    useAuthStore.getState().setAccessToken('token-abc');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await apiFetch('/api/whoami/');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer token-abc');
  });

  it('does not attach an Authorization header when skipAuth is set', async () => {
    useAuthStore.getState().setAccessToken('token-abc');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await apiFetch('/api/auth/login/', { skipAuth: true });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('on a 401, silently refreshes the token and retries the original request once', async () => {
    useAuthStore.getState().setAccessToken('stale-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: 'expired' }, false)) // original request
      .mockResolvedValueOnce(jsonResponse(200, { access: 'fresh-token' })) // refresh call
      .mockResolvedValueOnce(jsonResponse(200, { data: 'secret' })); // retried original request

    const result = await apiFetch('/api/protected/');

    expect(result).toEqual({ data: 'secret' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/api/auth/refresh/');
    expect(useAuthStore.getState().accessToken).toBe('fresh-token');
  });

  it('propagates the original 401 as an ApiError when the refresh also fails', async () => {
    useAuthStore.getState().setAccessToken('stale-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: 'expired' }, false))
      .mockResolvedValueOnce(jsonResponse(401, { error: 'no session' }, false));

    await expect(apiFetch('/api/protected/')).rejects.toBeInstanceOf(ApiError);
    // No third call — a failed refresh means the original request is never retried.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not attempt a refresh at all when skipAuth is set, even on a 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'bad credentials' }, false));

    await expect(apiFetch('/api/auth/login/', { skipAuth: true })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
