import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  isSimulator: false,
  isPassenger: false,
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
  nightTimeOverride: false,
  crossCountryTimeOverride: false,
  takeoffsDayOverride: false,
  takeoffsNightOverride: false,
  landingsDayOverride: false,
  landingsNightOverride: false,
  sicTimeOverride: false,
  multiPilotTimeOverride: false,
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
    // Under StrictMode's mount → cleanup → remount, the image still renders.
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

  describe('voided signatures', () => {
    const completed = {
      id: 'sig-active',
      flightId: 'flight-1',
      method: 'live',
      status: 'completed',
      instructorName: 'Jane Instructor',
      signedAt: '2026-01-16T12:00:00Z',
      emailSendCount: 0,
      createdAt: '2026-01-16T12:00:00Z',
      updatedAt: '2026-01-16T12:00:00Z',
    } as FlightSignature;
    const voided = {
      id: 'sig-old',
      flightId: 'flight-1',
      method: 'live',
      status: 'voided',
      instructorName: 'Old Instructor',
      instructorCredentialNumber: 'DE.FCL.999',
      signedAt: '2026-01-15T12:00:00Z',
      voidedAt: '2026-01-16T09:00:00Z',
      voidedReason: 'Wrong landing count',
      emailSendCount: 0,
      createdAt: '2026-01-15T12:00:00Z',
      updatedAt: '2026-01-16T09:00:00Z',
    } as FlightSignature;
    const signedFlight: Flight = { ...baseFlight, signatureId: 'sig-active' };

    it('is absent when no signature was voided', () => {
      mockSignatureHooks([completed]);
      renderWithProviders(signedFlight);

      expect(screen.queryByRole('button', { name: /voided signature/i })).not.toBeInTheDocument();
    });

    it('shows a collapsed count and expands to the voided entries', () => {
      mockSignatureHooks([completed, voided]);
      renderWithProviders(signedFlight);

      const toggle = screen.getByRole('button', { name: /1 voided signature/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Old Instructor')).not.toBeInTheDocument();

      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Old Instructor')).toBeInTheDocument();
      expect(screen.getByText(/DE\.FCL\.999/)).toBeInTheDocument();
      expect(screen.getByText(/Wrong landing count/)).toBeInTheDocument();
    });

    it('shows voided entries on an unsigned flight', () => {
      mockSignatureHooks([voided]);
      renderWithProviders(baseFlight);

      expect(screen.getByRole('button', { name: /sign now/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /1 voided signature/i })).toBeInTheDocument();
    });

    it('requests the voided image only when asked', () => {
      mockSignatureHooks([completed, voided]);
      const imageSpy = vi.mocked(useSignaturesHook.useFlightSignatureImageUrl);
      renderWithProviders(signedFlight);

      fireEvent.click(screen.getByRole('button', { name: /1 voided signature/i }));
      expect(imageSpy).not.toHaveBeenCalledWith('flight-1', 'sig-old');

      fireEvent.click(screen.getByRole('button', { name: /view signature/i }));
      expect(imageSpy).toHaveBeenCalledWith('flight-1', 'sig-old');
      expect(screen.getByRole('button', { name: /hide signature/i })).toBeInTheDocument();
    });
  });
});
