import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLogin, useRegister } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';

// Mock fetch before the API client captures it.
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  return mock;
});

const request = {
  email: 'pilot@example.com',
  password: 'Example123!pass',
  name: 'Pilot',
};
const user = { id: 'u1', email: request.email, name: request.name };
const session = {
  user,
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 900,
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}
function respond(body: unknown, status: number, headers = {}) {
  fetchMock.mockImplementation(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
      }),
  );
}

beforeEach(() => useAuthStore.getState().clearAuth());
afterEach(() => {
  useAuthStore.getState().clearAuth();
  fetchMock.mockReset();
});

describe('authentication through the real openapi-fetch client', () => {
  it.each([true, false])(
    'registers with verificationRequired=%s',
    async (verificationRequired) => {
      const body = {
        email: request.email,
        message: 'Created',
        verificationRequired,
      };
      respond(body, 201);
      const { result } = renderHook(() => useRegister(), { wrapper });
      await act(async () => {
        await expect(result.current.mutateAsync(request)).resolves.toEqual(
          body,
        );
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    },
  );

  it('stores a completed login', async () => {
    respond(session, 200);
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(request);
    });
    expect(useAuthStore.getState().accessToken).toBe('access');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('keeps 2FA pending without creating a session', async () => {
    const challenge = { requiresTwoFactor: true, twoFactorToken: 'challenge' };
    respond(challenge, 200);
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync(request)).resolves.toEqual(
        challenge,
      );
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  for (const [name, hook, successStatus] of [
    ['registration', useRegister, 201],
    ['login', useLogin, 200],
  ] as const) {
    it(`${name} rejects an empty CORS 403`, async () => {
      respond(undefined, 403, { 'Content-Length': '0' });
      const { result } = renderHook(() => hook(), { wrapper });
      await act(async () => {
        await expect(result.current.mutateAsync(request)).rejects.toEqual({
          httpStatus: 403,
        });
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it.each([
      ['204', undefined, 204],
      ['empty success', undefined, successStatus],
      ['null', null, successStatus],
      ['wrong shape', {}, successStatus],
      ['incomplete challenge', { requiresTwoFactor: true }, successStatus],
      [
        'empty challenge token',
        { requiresTwoFactor: true, twoFactorToken: '' },
        successStatus,
      ],
      [
        'ambiguous session and challenge',
        { ...session, requiresTwoFactor: true, twoFactorToken: 'challenge' },
        successStatus,
      ],
      [
        'missing refresh token',
        { user, accessToken: 'access', expiresIn: 900 },
        successStatus,
      ],
      ['unexpected success status', {}, 202],
    ])(`${name} rejects %s`, async (_label, body, status) => {
      respond(body, status as number);
      const { result } = renderHook(() => hook(), { wrapper });
      await act(async () => {
        await expect(result.current.mutateAsync(request)).rejects.toThrow(
          'Unexpected authentication response',
        );
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it(`${name} preserves structured API errors`, async () => {
      respond({ error: 'Rejected', code: 'example' }, 400);
      const { result } = renderHook(() => hook(), { wrapper });
      await act(async () => {
        await expect(result.current.mutateAsync(request)).rejects.toMatchObject(
          { error: 'Rejected', code: 'example', httpStatus: 400 },
        );
      });
    });
  }
});
