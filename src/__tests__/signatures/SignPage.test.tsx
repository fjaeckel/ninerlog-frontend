import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SignPage from '../../pages/SignPage';
import * as useSignaturesHook from '../../hooks/useSignatures';

const renderWithProviders = (path = '/sign?token=abc123') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <SignPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const mockFlightInfo = {
  status: 'pending' as const,
  flightDate: '2026-01-15',
  aircraftReg: 'D-EFGH',
  aircraftType: 'C172',
  totalTime: 90,
  dualTime: 90,
  expiresAt: '2026-01-22T00:00:00Z',
};

describe('SignPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // happy-dom's <canvas> has no real 2D rendering backend, so
    // toDataURL() doesn't produce a genuine base64 PNG. Stub it so the
    // submit-flow tests can exercise the real success path.
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,aGVsbG8=');
  });

  it('shows an invalid-link message when there is no token', () => {
    vi.spyOn(useSignaturesHook, 'usePublicSignatureInfo').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    vi.spyOn(useSignaturesHook, 'useCompletePublicSignature').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithProviders('/sign');

    expect(screen.getByText(/link invalid/i)).toBeInTheDocument();
  });

  it('shows an expired message on a 410 error', () => {
    vi.spyOn(useSignaturesHook, 'usePublicSignatureInfo').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 410 },
    } as any);
    vi.spyOn(useSignaturesHook, 'useCompletePublicSignature').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithProviders();

    expect(screen.getByText(/link expired/i)).toBeInTheDocument();
  });

  it('shows an invalid message on a 404 error', () => {
    vi.spyOn(useSignaturesHook, 'usePublicSignatureInfo').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 404 },
    } as any);
    vi.spyOn(useSignaturesHook, 'useCompletePublicSignature').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithProviders();

    expect(screen.getByText(/link invalid/i)).toBeInTheDocument();
  });

  it('renders the flight summary and signing form when the token is valid', () => {
    vi.spyOn(useSignaturesHook, 'usePublicSignatureInfo').mockReturnValue({
      data: mockFlightInfo,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    vi.spyOn(useSignaturesHook, 'useCompletePublicSignature').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);

    renderWithProviders();

    expect(screen.getByText(/D-EFGH/)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
  });

  it('requires a signature before allowing submission', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ message: 'ok' });
    vi.spyOn(useSignaturesHook, 'usePublicSignatureInfo').mockReturnValue({
      data: mockFlightInfo,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    vi.spyOn(useSignaturesHook, 'useCompletePublicSignature').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    renderWithProviders();

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Jane Instructor' } });
    // Submit button stays disabled until a signature has been drawn.
    expect(screen.getByRole('button', { name: /sign this entry/i })).toBeDisabled();
  });

  it('submits the drawn signature and shows the success state', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ message: 'ok' });
    vi.spyOn(useSignaturesHook, 'usePublicSignatureInfo').mockReturnValue({
      data: mockFlightInfo,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    vi.spyOn(useSignaturesHook, 'useCompletePublicSignature').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);

    renderWithProviders();

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Jane Instructor' } });
    const canvas = screen.getByRole('img', { name: /signature/i });
    fireEvent.pointerDown(canvas, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(canvas, { clientX: 15, clientY: 15 });

    fireEvent.click(screen.getByRole('button', { name: /sign this entry/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/signature recorded/i)).toBeInTheDocument());
  });
});
