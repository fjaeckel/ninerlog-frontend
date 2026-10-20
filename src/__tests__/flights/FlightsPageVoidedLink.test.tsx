import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightsPage from '../../pages/flights/FlightsPage';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useLicensesHook from '../../hooks/useLicenses';
import * as useLogbookHook from '../../hooks/useLogbook';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/flights']}>
        <FlightsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mode = (strict: boolean, voidedCount: number) =>
  ({ data: { strict, voidedCount, requiredBy: [], suggestedBy: [], events: [] }, isLoading: false }) as never;

describe('FlightsPage voided entries link', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({
      data: { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    } as never);
    vi.spyOn(useFlightsHook, 'useDeleteFlight').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
  });

  it('shows the link in strict mode', () => {
    vi.spyOn(useLogbookHook, 'useLogbookMode').mockReturnValue(mode(true, 0));
    renderPage();
    expect(screen.getByRole('link', { name: /voided entries/i })).toHaveAttribute('href', '/flights/voided');
  });

  it('keeps the link after strict mode is switched off while void records exist', () => {
    vi.spyOn(useLogbookHook, 'useLogbookMode').mockReturnValue(mode(false, 2));
    renderPage();
    expect(screen.getByRole('link', { name: /voided entries/i })).toBeInTheDocument();
  });

  it('hides the link in standard mode without void records', () => {
    vi.spyOn(useLogbookHook, 'useLogbookMode').mockReturnValue(mode(false, 0));
    renderPage();
    expect(screen.queryByRole('link', { name: /voided entries/i })).not.toBeInTheDocument();
  });

  it('hides the link while the mode is loading', () => {
    vi.spyOn(useLogbookHook, 'useLogbookMode').mockReturnValue({ data: undefined, isLoading: true } as never);
    renderPage();
    expect(screen.queryByRole('link', { name: /voided entries/i })).not.toBeInTheDocument();
  });

  it('never fetches the voided list to decide on the link', () => {
    const voidedSpy = vi.spyOn(useLogbookHook, 'useVoidedFlights');
    vi.spyOn(useLogbookHook, 'useLogbookMode').mockReturnValue(mode(false, 3));
    renderPage();
    expect(screen.getByRole('link', { name: /voided entries/i })).toBeInTheDocument();
    expect(voidedSpy).not.toHaveBeenCalled();
  });
});
