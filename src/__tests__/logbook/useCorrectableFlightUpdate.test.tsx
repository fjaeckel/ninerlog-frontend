import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCorrectableFlightUpdate } from '../../components/logbook/useCorrectableFlightUpdate';

const PUT = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: { PUT: (...args: unknown[]) => PUT(...args) },
}));

const reasonRequired = {
  data: undefined,
  error: { error: 'This edit is a correction and needs a reason', code: 'correction_reason_required' },
  response: { status: 422 },
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) },
    children
  );

describe('useCorrectableFlightUpdate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('settles an open reason prompt as cancelled when the host unmounts', async () => {
    PUT.mockResolvedValue(reasonRequired);
    const { result, unmount } = renderHook(() => useCorrectableFlightUpdate(), { wrapper });

    let outcome: Promise<unknown> = Promise.resolve();
    await act(async () => {
      outcome = result.current.save('f1', { totalTime: 95 } as never);
      await Promise.resolve();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    unmount();

    await expect(outcome).resolves.toEqual({ status: 'cancelled' });
    expect(PUT).toHaveBeenCalledTimes(1);
  });

  it('a save after unmount that needs a reason resolves cancelled instead of hanging', async () => {
    let release: (v: unknown) => void = () => {};
    PUT.mockReturnValue(new Promise((r) => (release = r)));
    const { result, unmount } = renderHook(() => useCorrectableFlightUpdate(), { wrapper });

    const outcome = result.current.save('f1', { totalTime: 95 } as never);
    unmount();
    release(reasonRequired);

    await expect(outcome).resolves.toEqual({ status: 'cancelled' });
  });

  it('a save that needs no reason resolves saved', async () => {
    PUT.mockResolvedValue({ data: { id: 'f1' }, error: undefined });
    const { result } = renderHook(() => useCorrectableFlightUpdate(), { wrapper });

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.save('f1', { totalTime: 95 } as never);
    });
    expect(outcome).toEqual({ status: 'saved', flight: { id: 'f1' } });
  });
});
