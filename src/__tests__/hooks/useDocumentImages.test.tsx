import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useDocumentImages,
  useUploadDocumentImage,
  useDeleteDocumentImage,
  useDocumentImageUrl,
} from '../../hooks/useDocumentImages';

const GET = vi.fn();
const POST = vi.fn();
const DELETE = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
    DELETE: (...args: unknown[]) => DELETE(...args),
  },
}));

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const wrap = (qc: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };

const anImage = { id: 'img-1', contentType: 'image/png', byteSize: 1024, createdAt: '', updatedAt: '' };

describe('useDocumentImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    GET.mockResolvedValue({ data: [anImage], error: undefined });
    POST.mockResolvedValue({ data: anImage, error: undefined });
    DELETE.mockResolvedValue({ data: undefined, error: undefined });
  });

  // Licences and credentials are different resources with different URLs; the
  // subject argument is what picks between them.
  it('addresses the licence collection for a licence', async () => {
    const { result } = renderHook(() => useDocumentImages('license', 'lic-1'), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(GET).toHaveBeenCalledWith('/licenses/{licenseId}/images', {
      params: { path: { licenseId: 'lic-1' } },
    });
  });

  it('addresses the credential collection for a credential', async () => {
    const { result } = renderHook(() => useDocumentImages('credential', 'cred-1'), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(GET).toHaveBeenCalledWith('/credentials/{credentialId}/images', {
      params: { path: { credentialId: 'cred-1' } },
    });
  });

  it('does not fetch before the parent record exists', () => {
    renderHook(() => useDocumentImages('license', null), { wrapper: wrap(makeClient()) });
    expect(GET).not.toHaveBeenCalled();
  });

  it('does not fetch when the feature is switched off', () => {
    renderHook(() => useDocumentImages('license', 'lic-1', false), { wrapper: wrap(makeClient()) });
    expect(GET).not.toHaveBeenCalled();
  });

  // The upload has to go through apiClient rather than a bare fetch, so it
  // inherits the auth header and the 401-refresh retry. Handing it a FormData
  // body is what lets openapi-fetch set the multipart boundary itself.
  it('uploads as multipart form data through the shared client', async () => {
    const { result } = renderHook(() => useUploadDocumentImage('license', 'lic-1'), {
      wrapper: wrap(makeClient()),
    });

    const file = new File(['bytes'], 'front.png', { type: 'image/png' });
    await act(async () => {
      await result.current.mutateAsync({ file, caption: 'Front page' });
    });

    expect(POST).toHaveBeenCalledTimes(1);
    const [path, options] = POST.mock.calls[0];
    expect(path).toBe('/licenses/{licenseId}/images');
    expect(options.params).toEqual({ path: { licenseId: 'lic-1' } });
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get('file')).toBe(file);
    expect((options.body as FormData).get('caption')).toBe('Front page');
  });

  it('omits an empty caption rather than sending a blank field', async () => {
    const { result } = renderHook(() => useUploadDocumentImage('credential', 'cred-1'), {
      wrapper: wrap(makeClient()),
    });

    await act(async () => {
      await result.current.mutateAsync({ file: new File([''], 'a.png', { type: 'image/png' }) });
    });

    expect((POST.mock.calls[0][1].body as FormData).has('caption')).toBe(false);
  });

  it('refreshes the listing after an upload', async () => {
    const qc = makeClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useUploadDocumentImage('license', 'lic-1'), { wrapper: wrap(qc) });

    await act(async () => {
      await result.current.mutateAsync({ file: new File([''], 'a.png', { type: 'image/png' }) });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['documentImages', 'license', 'lic-1'] });
  });

  it('refreshes the listing after a delete', async () => {
    const qc = makeClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteDocumentImage('credential', 'cred-1'), { wrapper: wrap(qc) });

    await act(async () => {
      await result.current.mutateAsync('img-1');
    });

    expect(DELETE).toHaveBeenCalledWith('/credentials/{credentialId}/images/{imageId}', {
      params: { path: { credentialId: 'cred-1', imageId: 'img-1' } },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['documentImages', 'credential', 'cred-1'] });
  });

  it('surfaces an API error instead of resolving with it', async () => {
    GET.mockResolvedValue({ data: undefined, error: { error: 'Not found' } });
    const { result } = renderHook(() => useDocumentImages('license', 'lic-1'), { wrapper: wrap(makeClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ error: 'Not found' });
  });
});

describe('useDocumentImageUrl', () => {
  const createObjectURL = vi.fn(() => 'blob:doc-image');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    GET.mockResolvedValue({ data: new Blob(['x']), error: undefined });
  });

  // There is no unauthenticated image URL, so the bytes must be fetched with
  // the bearer token and turned into a blob URL — a plain <img src> would 401.
  it('fetches the bytes as a blob and exposes an object URL', async () => {
    const { result } = renderHook(() => useDocumentImageUrl('license', 'lic-1', 'img-1'), {
      wrapper: wrap(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(GET).toHaveBeenCalledWith('/licenses/{licenseId}/images/{imageId}', {
      params: { path: { licenseId: 'lic-1', imageId: 'img-1' } },
      parseAs: 'blob',
    });
    expect(result.current.data).toBe('blob:doc-image');
  });

  it('revokes the object URL when the consumer unmounts', async () => {
    const { result, unmount } = renderHook(() => useDocumentImageUrl('credential', 'cred-1', 'img-1'), {
      wrapper: wrap(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:doc-image');
  });

  it('stays idle until both ids are known', () => {
    renderHook(() => useDocumentImageUrl('license', 'lic-1', null), { wrapper: wrap(makeClient()) });
    expect(GET).not.toHaveBeenCalled();
  });
});
