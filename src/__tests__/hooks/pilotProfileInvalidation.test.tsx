import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreateAircraft, useDeleteAircraft, useUpdateAircraft } from '../../hooks/useAircraft';
import { useCreateLicense, useDeleteLicense, useUpdateLicense } from '../../hooks/useLicenses';
import { useCreateClassRating, useDeleteClassRating, useUpdateClassRating } from '../../hooks/useClassRatings';

const ok = vi.fn(async () => ({ data: { id: 'x' }, error: undefined }));
vi.mock('../../api/client', () => ({
  apiClient: { POST: () => ok(), PATCH: () => ok(), DELETE: () => ok(), GET: () => ok() },
}));

const setup = () => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { spy, wrapper };
};

const cases: [string, () => { mutateAsync: (v: never) => Promise<unknown> }, unknown][] = [
  ['create aircraft', useCreateAircraft, { registration: 'D-1234' }],
  ['update aircraft', useUpdateAircraft, { id: 'a', data: {} }],
  ['delete aircraft', useDeleteAircraft, 'a'],
  ['create licence', useCreateLicense, { licenseType: 'SPL' }],
  ['update licence', useUpdateLicense, { id: 'l', data: {} }],
  ['delete licence', useDeleteLicense, 'l'],
  ['create class rating', useCreateClassRating, { licenseId: 'l', data: {} }],
  ['update class rating', useUpdateClassRating, { licenseId: 'l', ratingId: 'r', data: {} }],
  ['delete class rating', useDeleteClassRating, { licenseId: 'l', ratingId: 'r' }],
];

describe('mutations feeding pilot-profile evidence', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(cases)('%s invalidates the pilot profile', async (_name, useHook, vars) => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useHook(), { wrapper });
    await act(() => result.current.mutateAsync(vars as never));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['pilot-profile'] });
  });
});
