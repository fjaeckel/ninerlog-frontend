import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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
  fieldsHash: 'hash-as-shown',
};

const mockSigningFlow = (mutateAsync: ReturnType<typeof vi.fn>, refetch = vi.fn()) => {
  vi.spyOn(useSignaturesHook, 'usePublicSignatureInfo').mockReturnValue({
    data: mockFlightInfo,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch,
  } as unknown as ReturnType<typeof useSignaturesHook.usePublicSignatureInfo>);
  vi.spyOn(useSignaturesHook, 'useCompletePublicSignature').mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useSignaturesHook.useCompletePublicSignature>);
};

const drawAndSubmit = () => {
  fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Jane Instructor' } });
  const canvas = screen.getByRole('img', { name: /signature/i });
  fireEvent.pointerDown(canvas, { clientX: 5, clientY: 5 });
  fireEvent.pointerMove(canvas, { clientX: 15, clientY: 15 });
  fireEvent.pointerUp(canvas, { clientX: 15, clientY: 15 });
  fireEvent.click(screen.getByRole('button', { name: /sign this entry/i }));
};

describe('SignPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub toDataURL; happy-dom's <canvas> has no 2D backend.
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

  it('sends back the fieldsHash it was shown', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ message: 'ok' });
    mockSigningFlow(mutateAsync);
    renderWithProviders();

    drawAndSubmit();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ signerName: 'Jane Instructor', fieldsHash: 'hash-as-shown' });
  });

  it('on 409 flight_changed explains the change and reloads the entry on request', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      error: 'Flight was changed after the signing page was opened',
      code: 'flight_changed',
    });
    const refetch = vi.fn().mockResolvedValue({});
    mockSigningFlow(mutateAsync, refetch);
    renderWithProviders();

    drawAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'The flight was changed after this page was opened. Reload to see the current entry before signing.'
    );
    expect(screen.queryByText(/signature recorded/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^reload$/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign this entry/i })).toBeDisabled();
  });

  it('shows other submit errors as before', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ error: 'Signature image too large' });
    mockSigningFlow(mutateAsync);
    renderWithProviders();

    drawAndSubmit();

    expect(await screen.findByText('Signature image too large')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reload$/i })).not.toBeInTheDocument();
  });
});
