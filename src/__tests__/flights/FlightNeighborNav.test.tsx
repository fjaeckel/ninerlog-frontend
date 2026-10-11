import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import FlightNeighborNav from '../../components/flights/FlightNeighborNav';
import * as useFlightsHook from '../../hooks/useFlights';

function LocationProbe() {
  const location = useLocation();
  return (
    <p data-testid="location">
      {location.pathname}|{(location.state as { listSearch?: string } | null)?.listSearch ?? ''}
    </p>
  );
}

const neighbors = (over: Record<string, unknown> = {}) =>
  vi.spyOn(useFlightsHook, 'useFlightNeighbors').mockReturnValue({
    data: { previousId: 'prev', nextId: 'next', position: 3, total: 12, ...over },
  } as never);

function renderNav({ keyboard = true, listSearch = '?q=night%3E0&sortBy=totalTime' } = {}) {
  return render(
    <MemoryRouter initialEntries={['/flights/current']}>
      <Routes>
        <Route
          path="/flights/:flightId"
          element={
            <>
              <FlightNeighborNav flightId="current" listSearch={listSearch} keyboard={keyboard} />
              <input aria-label="notes" />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('FlightNeighborNav', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('asks for the neighbours in the list order and filters it came from', () => {
    const spy = neighbors();
    renderNav();

    expect(spy).toHaveBeenCalledWith('current', expect.objectContaining({ q: 'night>0', sortBy: 'totalTime', sortOrder: 'desc' }));
    expect(screen.getByText('3 of 12')).toBeInTheDocument();
  });

  it('steps to the next flight and keeps the list query for the way back', async () => {
    neighbors();
    renderNav();

    await userEvent.click(screen.getByRole('button', { name: 'Next flight' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/flights/next|?q=night%3E0&sortBy=totalTime');
  });

  it('disables the buttons at either end of the list', () => {
    neighbors({ previousId: null, position: 1 });
    renderNav();

    expect(screen.getByRole('button', { name: 'Previous flight' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next flight' })).toBeEnabled();
  });

  it('follows the left and right arrow keys', () => {
    neighbors();
    renderNav();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('location')).toHaveTextContent('/flights/prev');
  });

  it('leaves arrow keys alone while typing, with modifiers, or when switched off', () => {
    neighbors();
    const { unmount } = renderNav();

    fireEvent.keyDown(screen.getByLabelText('notes'), { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true });
    expect(screen.getByTestId('location')).toHaveTextContent('/flights/current');
    unmount();

    renderNav({ keyboard: false });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('location')).toHaveTextContent('/flights/current');
  });

  it('does not render for a flight outside the list', () => {
    neighbors({ previousId: null, nextId: null, position: null });
    renderNav();

    expect(screen.queryByTestId('flight-neighbor-nav')).not.toBeInTheDocument();
  });
});
