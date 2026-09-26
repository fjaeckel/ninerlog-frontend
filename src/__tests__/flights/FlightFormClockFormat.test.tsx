import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useAircraftHook from '../../hooks/useAircraft';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  const ok = () => Promise.resolve({ data: undefined, error: undefined, response: new Response() });
  return {
    ...actual,
    apiClient: { GET: vi.fn(ok), POST: vi.fn(ok), PUT: vi.fn(ok), PATCH: vi.fn(ok), DELETE: vi.fn(ok) },
  };
});

type Mocked<T extends (...args: never[]) => unknown> = ReturnType<T>;

const renderForm = (flightId?: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FlightForm flightId={flightId} onClose={vi.fn()} />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('FlightForm clock format', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'p@example.com', name: 'Pilot', clockFormat: '12h', createdAt: '', updatedAt: '' },
    });
    vi.spyOn(useFlightsHook, 'useCreateFlight').mockReturnValue(
      { mutateAsync: vi.fn(), isPending: false } as unknown as Mocked<typeof useFlightsHook.useCreateFlight>,
    );
    vi.spyOn(useFlightsHook, 'useUpdateFlight').mockReturnValue(
      { mutateAsync: vi.fn(), isPending: false } as unknown as Mocked<typeof useFlightsHook.useUpdateFlight>,
    );
    vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue(
      { data: undefined } as unknown as Mocked<typeof useFlightsHook.useFlights>,
    );
    vi.spyOn(useFlightsHook, 'useFlight').mockReturnValue({
      data: { id: 'flight-12h', date: '2026-01-15', offBlockTime: '14:15:00', onBlockTime: '16:10:00', distance: 0 },
      isLoading: false,
      error: null,
    } as unknown as Mocked<typeof useFlightsHook.useFlight>);
    vi.spyOn(useAircraftHook, 'useAircraft').mockReturnValue(
      { data: [], isLoading: false, error: null } as unknown as Mocked<typeof useAircraftHook.useAircraft>,
    );
    vi.spyOn(useAircraftHook, 'useCreateAircraft').mockReturnValue(
      { mutateAsync: vi.fn(), isPending: false } as unknown as Mocked<typeof useAircraftHook.useCreateAircraft>,
    );
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
    vi.restoreAllMocks();
  });

  it('shows stored times in 12-hour format', async () => {
    renderForm('flight-12h');
    await waitFor(() => {
      expect((screen.getByLabelText(/off-block/i) as HTMLInputElement).value).toBe('2:15 PM');
    });
    expect((screen.getByLabelText(/on-block/i) as HTMLInputElement).value).toBe('4:10 PM');
    expect(screen.getByLabelText('Takeoff')).toHaveAttribute('placeholder', 'h:mm AM');
  });

  it('accepts 12-hour input and keeps showing it in 12-hour format', async () => {
    const user = userEvent.setup();
    renderForm('flight-12h');
    await user.type(screen.getByLabelText('Takeoff'), '2:30 pm');
    await user.tab();
    expect((screen.getByLabelText('Takeoff') as HTMLInputElement).value).toBe('2:30 PM');
  });
});
