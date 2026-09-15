import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LegalPage from '../../pages/legal/LegalPage';

vi.mock('../../lib/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/config')>()),
  LEGAL_DOCS: ['terms', 'privacy'],
}));

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/legal/:docId" element={<LegalPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function markdown(body: string) {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/markdown' } });
}

describe('LegalPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/legal/terms.md') return markdown('# Terms of Service\n\nBe nice to the **aeroplane**.');
      if (url === '/legal/privacy.md') return markdown('# Privacy Policy\n\nWe keep your logbook.');
      return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the terms markdown', async () => {
    renderAt('/legal/terms');

    expect(await screen.findByText('aeroplane')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1, name: 'Terms of Service' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });

  it('links between the published documents', async () => {
    renderAt('/legal/privacy');

    expect(await screen.findByText('We keep your logbook.')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Legal' });
    expect(nav).toHaveTextContent('Terms of Service');
    expect(nav).toHaveTextContent('Privacy Policy');
  });

  it('shows an error state when the document cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    renderAt('/legal/terms');

    expect(await screen.findByRole('alert')).toHaveTextContent('Document unavailable');
  });

  it('adds a page heading when the document has none', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => markdown('Just a paragraph.')));
    renderAt('/legal/privacy');

    expect(await screen.findByText('Just a paragraph.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
  });

  it('redirects unknown documents home', async () => {
    renderAt('/legal/imprint');

    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());
  });
});
