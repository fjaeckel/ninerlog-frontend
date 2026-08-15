import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExportPage from '../../pages/export/ExportPage';
import type { ExportTarget } from '../../hooks/useExport';

const TARGETS: ExportTarget[] = [
  {
    id: 'foreflight',
    product: 'ForeFlight Logbook',
    contentType: 'text/csv; charset=utf-8',
    extension: 'csv',
    notes: 'Two-table ForeFlight import template.',
    verified: false,
  },
  {
    id: 'myflightbook',
    product: 'MyFlightbook',
    contentType: 'text/csv; charset=utf-8',
    extension: 'csv',
    notes: 'MyFlightbook import columns.',
    verified: true,
  },
];

// The destination list is server-driven, so the page is mounted against a
// stubbed registry rather than whatever the real backend happens to support.
const mockUseExportTargets = vi.fn();
vi.mock('../../hooks/useExport', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useExport')>(
    '../../hooks/useExport'
  );
  return {
    ...actual,
    useExportTargets: () => mockUseExportTargets(),
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

/** Mock fetch for blob downloads and return the mock for URL assertions. */
const mockDownload = (body = 'test', type = 'text/csv') => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob([body], { type })),
  });
  global.fetch = mockFetch;
  global.URL.createObjectURL = vi.fn(() => 'blob:test');
  global.URL.revokeObjectURL = vi.fn();
  return mockFetch;
};

/**
 * Find the download call for a given path. Asserting on `calls[0]` is unsafe
 * here — the page also fetches other things — so match on the URL instead.
 */
const urlFor = (mockFetch: ReturnType<typeof vi.fn>, path: string): string => {
  const call = mockFetch.mock.calls.find(
    ([url]) => typeof url === 'string' && url.includes(path)
  );
  expect(call, `no fetch call matched ${path}`).toBeDefined();
  return call![0] as string;
};

beforeEach(() => {
  mockUseExportTargets.mockReturnValue({ data: TARGETS, isLoading: false });
});

describe('ExportPage', () => {
  it('renders export page with title', () => {
    renderWithProviders(<ExportPage />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders CSV export card', () => {
    renderWithProviders(<ExportPage />);
    expect(screen.getByText('Flight Log CSV')).toBeInTheDocument();
    expect(screen.getByText('Download CSV')).toBeInTheDocument();
  });

  it('renders JSON backup card', () => {
    renderWithProviders(<ExportPage />);
    expect(screen.getByText('Full Data Backup')).toBeInTheDocument();
    expect(screen.getByText('Download JSON backup')).toBeInTheDocument();
  });

  it('renders import link card', () => {
    renderWithProviders(<ExportPage />);
    expect(screen.getByText('Import Flights')).toBeInTheDocument();
    expect(screen.getByText('Go to Import →')).toBeInTheDocument();
  });

  it('renders about section with format descriptions', () => {
    renderWithProviders(<ExportPage />);
    expect(screen.getByText('About Exports')).toBeInTheDocument();
    expect(screen.getByText(/Your data is yours/)).toBeInTheDocument();
  });

  it('CSV export button triggers download', async () => {
    const user = userEvent.setup();
    const mockFetch = mockDownload();

    renderWithProviders(<ExportPage />);
    await user.click(screen.getByText('Download CSV'));

    expect(urlFor(mockFetch, '/exports/csv')).toContain('/exports/csv');
  });

  it('JSON export button triggers download', async () => {
    const user = userEvent.setup();
    const mockFetch = mockDownload('{}', 'application/json');

    renderWithProviders(<ExportPage />);
    await user.click(screen.getByText('Download JSON backup'));

    expect(urlFor(mockFetch, '/exports/json')).toContain('/exports/json');
  });

  it('PDF export sends layout and rows_per_page when set', async () => {
    const user = userEvent.setup();
    const mockFetch = mockDownload('%PDF', 'application/pdf');

    renderWithProviders(<ExportPage />);
    await user.selectOptions(screen.getByLabelText('Page layout'), 'single');
    await user.type(screen.getByLabelText('Rows per page'), '20');
    await user.click(screen.getByText('Download PDF logbook'));

    const url = urlFor(mockFetch, '/exports/pdf');
    expect(url).toContain('layout=single');
    expect(url).toContain('rows_per_page=20');
  });

  it('hides layout and row controls for the summary format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportPage />);
    expect(screen.getByLabelText('Page layout')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('PDF format'), 'summary');
    expect(screen.queryByLabelText('Page layout')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Rows per page')).not.toBeInTheDocument();
  });

  it('shows error message on export failure', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    renderWithProviders(<ExportPage />);
    await user.click(screen.getByText('Download CSV'));

    expect(await screen.findByText('Export failed. Please try again.')).toBeInTheDocument();
  });

  describe('moving to another logbook', () => {
    it('offers the complete archive', () => {
      renderWithProviders(<ExportPage />);
      expect(screen.getByText('Complete logbook archive')).toBeInTheDocument();
      expect(screen.getByText('Download complete archive')).toBeInTheDocument();
    });

    it('archive button downloads the archive', async () => {
      const user = userEvent.setup();
      const mockFetch = mockDownload('PK', 'application/zip');

      renderWithProviders(<ExportPage />);
      await user.click(screen.getByText('Download complete archive'));

      expect(urlFor(mockFetch, '/exports/archive')).toContain('/exports/archive');
    });

    it('renders a card per server-advertised destination', () => {
      renderWithProviders(<ExportPage />);
      expect(screen.getByText('ForeFlight Logbook')).toBeInTheDocument();
      expect(screen.getByText('MyFlightbook')).toBeInTheDocument();
      expect(screen.getByText('Two-table ForeFlight import template.')).toBeInTheDocument();
    });

    it('downloads for the chosen destination with its target parameter', async () => {
      const user = userEvent.setup();
      const mockFetch = mockDownload();

      renderWithProviders(<ExportPage />);
      await user.click(screen.getByText('Download for ForeFlight Logbook'));

      const url = urlFor(mockFetch, '/exports/logbook');
      expect(url).toContain('target=foreflight');
    });

    // A pilot about to move their logbook must not be told a layout is proven
    // when it has never been round-tripped through the real product.
    it('marks unverified layouts and leaves verified ones unmarked', () => {
      renderWithProviders(<ExportPage />);
      expect(screen.getAllByText('Not yet verified')).toHaveLength(1);
    });

    // The vendor formats are lossy; failing to say so is how somebody loses
    // their licences and prior hours without noticing.
    it('warns that per-product files do not carry everything', () => {
      renderWithProviders(<ExportPage />);
      expect(
        screen.getByText(/None of them carries your licences, medicals, contacts/)
      ).toBeInTheDocument();
    });

    it('shows a loading state while the destination list is in flight', () => {
      mockUseExportTargets.mockReturnValue({ data: undefined, isLoading: true });
      renderWithProviders(<ExportPage />);
      expect(screen.getByText('Loading destinations...')).toBeInTheDocument();
    });
  });
});
