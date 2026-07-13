import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignatureSection } from '../../components/flights/SignatureSection';
import * as useSignaturesHook from '../../hooks/useSignatures';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];
type FlightSignature = components['schemas']['FlightSignature'];

const renderWithProviders = (flight: Flight, { strict = false }: { strict?: boolean } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = (
    <QueryClientProvider client={queryClient}>
      <SignatureSection flight={flight} />
    </QueryClientProvider>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

const baseFlight: Flight = {
  id: 'flight-1',
  userId: 'user-1',
  date: '2026-01-15',
  aircraftReg: 'D-EFGH',
  aircraftType: 'C172',
  totalTime: 90,
  isPic: false,
  isDual: true,
  picTime: 0,
  dualTime: 90,
  nightTime: 0,
  ifrTime: 0,
  landingsDay: 1,
  landingsNight: 0,
  allLandings: 1,
  takeoffsDay: 1,
  takeoffsNight: 0,
  soloTime: 0,
  crossCountryTime: 0,
  distance: 0,
  sicTime: 0,
  dualGivenTime: 0,
  simulatedFlightTime: 0,
  groundTrainingTime: 0,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
};

const mockMutation = () => ({ mutateAsync: vi.fn(), isPending: false } as any);

function mockSignatureHooks(signatures: FlightSignature[]) {
  vi.spyOn(useSignaturesHook, 'useFlightSignatures').mockReturnValue({
    data: signatures,
    isLoading: false,
  } as any);
  vi.spyOn(useSignaturesHook, 'useSignFlightLive').mockReturnValue(mockMutation());
  vi.spyOn(useSignaturesHook, 'useCreateSignatureRequest').mockReturnValue(mockMutation());
  vi.spyOn(useSignaturesHook, 'useResendSignatureRequest').mockReturnValue(mockMutation());
  vi.spyOn(useSignaturesHook, 'useRevokeSignatureRequest').mockReturnValue(mockMutation());
  vi.spyOn(useSignaturesHook, 'useVoidFlightSignature').mockReturnValue(mockMutation());
  vi.spyOn(useSignaturesHook, 'useFlightSignatureImageUrl').mockReturnValue({
    data: undefined,
    isLoading: false,
  } as any);
}

describe('SignatureSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-now and request actions when unsigned', () => {
    mockSignatureHooks([]);
    renderWithProviders(baseFlight);

    expect(screen.getByRole('button', { name: /sign now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request via email/i })).toBeInTheDocument();
  });

  it('shows the pending-request panel when a deferred request is awaiting signature', () => {
    mockSignatureHooks([
      {
        id: 'sig-1',
        flightId: 'flight-1',
        method: 'deferred',
        status: 'pending',
        instructorEmail: 'instructor@example.com',
        emailSendCount: 1,
        tokenExpiresAt: '2026-01-22T00:00:00Z',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
      } as FlightSignature,
    ]);
    renderWithProviders(baseFlight);

    expect(screen.getByText(/awaiting instructor signature/i)).toBeInTheDocument();
    expect(screen.getByText(/instructor@example\.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel request/i })).toBeInTheDocument();
  });

  it('shows the locked banner and signer info when the flight is signed', () => {
    const signedFlight: Flight = { ...baseFlight, signatureId: 'sig-2' };
    mockSignatureHooks([
      {
        id: 'sig-2',
        flightId: 'flight-1',
        method: 'live',
        status: 'completed',
        instructorName: 'Jane Instructor',
        signedAt: '2026-01-15T12:00:00Z',
        emailSendCount: 0,
        createdAt: '2026-01-15T12:00:00Z',
        updatedAt: '2026-01-15T12:00:00Z',
      } as FlightSignature,
    ]);
    renderWithProviders(signedFlight);

    expect(screen.getByText(/locked by an instructor signature/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Instructor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /void signature/i })).toBeInTheDocument();
  });

  it('renders a working signature image under React.StrictMode (regression: must not revoke the shared blob URL on the mount/cleanup/remount cycle)', () => {
    // StrictMode intentionally mounts -> cleans up -> remounts every
    // component once in development, specifically to surface exactly this
    // bug class: a `useEffect` cleanup that revokes/frees a resource whose
    // real lifetime is owned elsewhere (here, the React Query cache for
    // useFlightSignatureImageUrl) gets called after the *first* simulated
    // unmount, but the *second* mount reuses the same cached blob URL
    // string — which is now dead, so the <img> renders broken. This is
    // invisible in a plain (non-strict) render, which is why it shipped.
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const signedFlight: Flight = { ...baseFlight, signatureId: 'sig-3' };
    mockSignatureHooks([
      {
        id: 'sig-3',
        flightId: 'flight-1',
        method: 'live',
        status: 'completed',
        instructorName: 'Jane Instructor',
        signedAt: '2026-01-15T12:00:00Z',
        emailSendCount: 0,
        createdAt: '2026-01-15T12:00:00Z',
        updatedAt: '2026-01-15T12:00:00Z',
      } as FlightSignature,
    ]);
    vi.spyOn(useSignaturesHook, 'useFlightSignatureImageUrl').mockReturnValue({
      data: 'blob:http://localhost/fake-signature-image',
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(signedFlight, { strict: true });

    const img = screen.getByRole('img', { name: /signature/i }) as HTMLImageElement;
    expect(img.src).toBe('blob:http://localhost/fake-signature-image');
    expect(revokeSpy).not.toHaveBeenCalled();
  });
});
