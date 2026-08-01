import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlightColumnsSection } from '../../components/profile/FlightColumnsSection';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../types/api';

vi.mock('../../hooks/useProfile', () => ({
  useUpdateProfile: vi.fn(),
}));

import { useUpdateProfile } from '../../hooks/useProfile';

const renderWithClient = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const signIn = (overrides: Partial<User> = {}) => {
  useAuthStore.setState({
    user: {
      id: 'user-1',
      email: 'pilot@example.com',
      name: 'Pilot',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    },
    isAuthenticated: true,
  });
};

/** Echoes the request back, standing in for the API's normalization. */
const mockSave = () => {
  const mutateAsync = vi.fn().mockImplementation(async (body) => ({
    flightListColumnMode: body.flightListColumnMode,
    flightListColumns: body.flightListColumns,
  }));
  vi.mocked(useUpdateProfile).mockReturnValue({ mutateAsync, isPending: false } as never);
  return mutateAsync;
};

describe('FlightColumnsSection', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('starts in automatic mode and hides the column checkboxes', () => {
    signIn();
    mockSave();

    renderWithClient(<FlightColumnsSection />);

    expect(screen.getByTestId('flight-columns-mode-auto')).toBeChecked();
    expect(screen.queryByTestId('flight-column-ifrTime')).not.toBeInTheDocument();
  });

  it('seeds a first switch to custom mode instead of emptying the table', async () => {
    signIn();
    const mutateAsync = mockSave();

    renderWithClient(<FlightColumnsSection />);
    await userEvent.click(screen.getByTestId('flight-columns-mode-custom'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const body = mutateAsync.mock.calls[0][0];
    expect(body.flightListColumnMode).toBe('custom');
    expect(body.flightListColumns.length).toBeGreaterThan(0);
    expect(body.flightListColumns).toContain('picTime');
  });

  it('shows the saved selection as checked', () => {
    signIn({ flightListColumnMode: 'custom', flightListColumns: ['nightTime'] });
    mockSave();

    renderWithClient(<FlightColumnsSection />);

    expect(screen.getByTestId('flight-column-nightTime')).toBeChecked();
    expect(screen.getByTestId('flight-column-ifrTime')).not.toBeChecked();
  });

  it('adds a column and persists the whole list', async () => {
    signIn({ flightListColumnMode: 'custom', flightListColumns: ['nightTime'] });
    const mutateAsync = mockSave();

    renderWithClient(<FlightColumnsSection />);
    await userEvent.click(screen.getByTestId('flight-column-ifrTime'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0].flightListColumns).toEqual(['nightTime', 'ifrTime']);
  });

  it('lets the user clear the last column rather than falling back to automatic', async () => {
    signIn({ flightListColumnMode: 'custom', flightListColumns: ['nightTime'] });
    const mutateAsync = mockSave();

    renderWithClient(<FlightColumnsSection />);
    await userEvent.click(screen.getByTestId('flight-column-nightTime'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toEqual({
      flightListColumnMode: 'custom',
      flightListColumns: [],
    });
  });

  it('adopts the list the API stored, not the one it was sent', async () => {
    signIn({ flightListColumnMode: 'custom', flightListColumns: ['ifrTime'] });
    const mutateAsync = vi.fn().mockResolvedValue({
      flightListColumnMode: 'custom',
      // The API reorders into canonical display order.
      flightListColumns: ['picTime', 'ifrTime'],
    });
    vi.mocked(useUpdateProfile).mockReturnValue({ mutateAsync, isPending: false } as never);

    renderWithClient(<FlightColumnsSection />);
    await userEvent.click(screen.getByTestId('flight-column-picTime'));

    await waitFor(() =>
      expect(useAuthStore.getState().user?.flightListColumns).toEqual(['picTime', 'ifrTime'])
    );
  });

  it('reports a failed save', async () => {
    signIn();
    const mutateAsync = vi.fn().mockRejectedValue(new Error('nope'));
    vi.mocked(useUpdateProfile).mockReturnValue({ mutateAsync, isPending: false } as never);

    renderWithClient(<FlightColumnsSection />);
    await userEvent.click(screen.getByTestId('flight-columns-mode-custom'));

    expect(await screen.findByText(/could not save your column selection/i)).toBeInTheDocument();
  });
});
