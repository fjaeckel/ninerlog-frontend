import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useAircraftHook from '../../hooks/useAircraft';

const renderForm = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FlightForm flightId="flight-1" onClose={onClose} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const onClose = vi.fn();
const update = { mutateAsync: vi.fn(), isPending: false };

const existing = {
  id: 'flight-1', userId: 'user-1', date: '2026-01-15',
  aircraftReg: 'D-EFGH', aircraftType: 'C172',
  departureIcao: 'EDDF', arrivalIcao: 'EDDH',
  offBlockTime: '14:15:00', onBlockTime: '16:10:00',
  departureTime: '14:30:00', arrivalTime: '16:00:00',
  totalTime: 115, picTime: 115, dualTime: 0,
  nightTime: 30, nightTimeOverride: true,
  crossCountryTime: 115, crossCountryTimeOverride: false,
  ifrTime: 0, landingsDay: 1, landingsNight: 0, allLandings: 1,
  takeoffsDay: 1, takeoffsNight: 0, soloTime: 0, distance: 185.3,
  remarks: null, createdAt: '', updatedAt: '',
};

const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: /update flight/i }).closest('form')!);

describe('FlightForm strict-mode errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mutateAsync.mockReset();
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(update as never);
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({ data: existing, isLoading: false, error: null } as never);
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue({ data: { data: [] } } as never);
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue({ data: [] } as never);
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  });

  it('asks for a reason on correction_reason_required and resubmits with it', async () => {
    const user = userEvent.setup();
    update.mutateAsync
      .mockRejectedValueOnce({ error: 'needs a reason', code: 'correction_reason_required' })
      .mockResolvedValueOnce({ id: 'flight-1' });

    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/^night time/i)).toHaveValue(30));
    submit();

    expect(await screen.findByRole('dialog', { name: /reason for the correction/i })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /save correction/i }));
    expect(screen.getByText(/enter a reason for the correction/i)).toBeInTheDocument();
    expect(update.mutateAsync).toHaveBeenCalledTimes(1);

    await user.type(screen.getByRole('textbox', { name: /^reason/i }), '  Wrong on-block time  ');
    await user.click(screen.getByRole('button', { name: /save correction/i }));

    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledTimes(2));
    expect(update.mutateAsync.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        id: 'flight-1',
        data: expect.objectContaining({ correctionReason: 'Wrong on-block time', nightTime: 30 }),
      })
    );
    expect(update.mutateAsync.mock.calls[0][0].data).not.toHaveProperty('correctionReason');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('keeps the form open when the reason dialog is cancelled', async () => {
    const user = userEvent.setup();
    update.mutateAsync.mockRejectedValueOnce({ error: 'needs a reason', code: 'correction_reason_required' });

    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/^night time/i)).toHaveValue(30));
    submit();
    const dialog = await screen.findByRole('dialog', { name: /reason for the correction/i });

    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog', { name: /reason for the correction/i })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows override_exceeds_calculated on the field', async () => {
    update.mutateAsync.mockRejectedValueOnce({
      error: 'A manual override may only reduce an auto-calculated time',
      code: 'override_exceeds_calculated',
      details: [{ field: 'nightTime', message: 'Must not exceed the calculated 20 min' }],
    });

    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/^night time/i)).toHaveValue(30));
    submit();

    expect(await screen.findByText('Must not exceed the calculated 20 min')).toBeInTheDocument();
    expect(screen.getByLabelText(/^night time/i)).toHaveClass('input-error');
    expect(screen.queryByRole('dialog', { name: /reason for the correction/i })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
