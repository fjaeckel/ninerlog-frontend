import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDocumentFilesFeature } from '../../hooks/useFeatures';

const GET = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: { GET: (...args: unknown[]) => GET(...args) },
}));

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

const enabledFeature = {
  enabled: true,
  maxBytes: 5 * 1024 * 1024,
  maxPerDocument: 5,
  allowedContentTypes: ['image/jpeg', 'image/png', 'application/pdf'],
};

describe('useDocumentFilesFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the limits the server reports', async () => {
    GET.mockResolvedValue({ data: { documentFiles: enabledFeature }, error: undefined });

    const { result } = renderHook(() => useDocumentFilesFeature(), { wrapper: wrap(makeClient()) });

    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.maxPerDocument).toBe(5);
    expect(result.current.allowedContentTypes).toContain('application/pdf');
  });

  it('reads as disabled until the probe answers', () => {
    GET.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDocumentFilesFeature(), { wrapper: wrap(makeClient()) });

    expect(result.current.enabled).toBe(false);
    expect(result.current.maxBytes).toBe(0);
  });

  it('reads as disabled when the probe fails', async () => {
    GET.mockResolvedValue({ data: undefined, error: { message: 'boom' } });

    const { result } = renderHook(() => useDocumentFilesFeature(), { wrapper: wrap(makeClient()) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });

  // A /features payload missing the documentFiles key degrades to "off".
  it('reads as disabled when the server omits the key entirely', async () => {
    GET.mockResolvedValue({ data: { somethingElse: { enabled: true } }, error: undefined });

    const { result } = renderHook(() => useDocumentFilesFeature(), { wrapper: wrap(makeClient()) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
    expect(result.current.allowedContentTypes).toEqual([]);
  });
});
