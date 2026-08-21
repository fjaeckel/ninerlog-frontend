import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshAccessToken } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../types/api';

const USER = { id: 'u1', email: 'pilot@example.com', name: 'Test Pilot' } as User;

function signIn() {
  useAuthStore.getState().setAuth(USER, 'access-1', 'refresh-1', 900);
}

/**
 * Runs a refresh to completion, driving the backoff timers. The advance is
 * bounded to just past the last backoff so the module's own re-arming refresh
 * timer, scheduled minutes out, stays asleep.
 */
async function runRefresh(): Promise<boolean> {
  const pending = refreshAccessToken();
  await vi.advanceTimersByTimeAsync(20_000);
  return pending;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.getState().clearAuth();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stores the rotated pair and keeps the session', async () => {
    signIn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 900 })
      )
    );

    await expect(runRefresh()).resolves.toBe(true);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-2');
    expect(state.refreshToken).toBe('refresh-2');
    expect(state.isAuthenticated).toBe(true);
  });

  // The contract: only a 401 from /auth/refresh ends a session.
  it('clears the session on 401', async () => {
    signIn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, 401)));

    await expect(runRefresh()).resolves.toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it.each([
    ['a rate limit', 429],
    ['a bad gateway while the API restarts', 502],
    ['a server error', 500],
    ['a gateway timeout', 504],
  ])('keeps the session through %s', async (_label, status) => {
    signIn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'transient' }, status)));

    await expect(runRefresh()).resolves.toBe(false);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.refreshToken).toBe('refresh-1');
  });

  it('keeps the session when the network is unreachable', async () => {
    signIn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(runRefresh()).resolves.toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().refreshToken).toBe('refresh-1');
  });

  it('retries a transient failure and succeeds', async () => {
    signIn();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ error: 'restarting' }, 503))
      .mockResolvedValue(
        jsonResponse({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 900 })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(runRefresh()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe('access-2');
  });

  it('gives up after a bounded number of attempts', async () => {
    signIn();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(runRefresh()).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    // Giving up is not signing out.
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('stops retrying as soon as the API reports the session ended', async () => {
    signIn();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(jsonResponse({ error: 'nope' }, 401));
    vi.stubGlobal('fetch', fetchMock);

    await expect(runRefresh()).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('treats a malformed success body as transient', async () => {
    signIn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ accessToken: 'only-one' })));

    await expect(runRefresh()).resolves.toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().refreshToken).toBe('refresh-1');
  });

  it('clears an authenticated state that has no refresh token', async () => {
    signIn();
    useAuthStore.setState({ refreshToken: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(runRefresh()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
