import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExportPage from '../../pages/export/ExportPage';

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
    expect(screen.getByText('Download JSON Backup')).toBeInTheDocument();
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
    // Mock fetch to avoid actual network call
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test'], { type: 'text/csv' })),
    });
    global.fetch = mockFetch;
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();

    renderWithProviders(<ExportPage />);
    await user.click(screen.getByText('Download CSV'));

    // The fetch should have been called with the export URL
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/exports/csv'),
      expect.any(Object)
    );
  });

  it('JSON export button triggers download', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['{}'], { type: 'application/json' })),
    });
    global.fetch = mockFetch;
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();

    renderWithProviders(<ExportPage />);
    await user.click(screen.getByText('Download JSON Backup'));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/exports/json'),
      expect.any(Object)
    );
  });

  it('shows error message on export failure', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    renderWithProviders(<ExportPage />);
    await user.click(screen.getByText('Download CSV'));

    expect(await screen.findByText('Export failed. Please try again.')).toBeInTheDocument();
  });
});
