import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchLegalDocument } from '../../hooks/useLegalDocument';

function response(body: string, { status = 200, type = 'text/markdown' } = {}) {
  return new Response(body, { status, headers: { 'content-type': type } });
}

describe('fetchLegalDocument', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers the language variant', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === '/legal/terms.de.md' ? response('# AGB') : response('# Terms')
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLegalDocument('terms', 'de')).resolves.toBe('# AGB');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default file when the variant is missing', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === '/legal/terms.de.md' ? response('Not found', { status: 404, type: 'text/plain' }) : response('# Terms')
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLegalDocument('terms', 'de')).resolves.toBe('# Terms');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/legal/terms.de.md', '/legal/terms.md']);
  });

  it('treats the SPA html fallback as missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response('<!doctype html>', { type: 'text/html' })));

    await expect(fetchLegalDocument('privacy', 'en')).rejects.toThrow(/not available/);
  });
});
