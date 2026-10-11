import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import FlightNeighborNav from '../../components/flights/FlightNeighborNav';
import * as useFlightsHook from '../../hooks/useFlights';

const TOTAL = 45;
const ids = Array.from({ length: TOTAL }, (_, i) => `f${i}`);

/** Serves the list's pages of 20 from `ids`, the way GET /flights would. */
function serveList({ placeholder = false } = {}) {
  return vi.spyOn(useFlightsHook, 'useFlights').mockImplementation(
    (params, options) =>
      ({
        data:
          options?.enabled === false
            ? undefined
            : {
                data: ids.slice(((params?.page ?? 1) - 1) * 20, (params?.page ?? 1) * 20).map((id) => ({ id })),
                pagination: { page: params?.page ?? 1, pageSize: 20, total: TOTAL, totalPages: 3 },
              },
        isPlaceholderData: placeholder,
      }) as never
  );
}

function LocationProbe() {
  const location = useLocation();
  const state = location.state as { listSearch?: string; listIndex?: number } | null;
  return (
    <p data-testid="location">
      {location.pathname}|{state?.listSearch ?? ''}|{state?.listIndex ?? ''}
    </p>
  );
}

function renderNav({
  flightId = 'f5',
  listIndex = 5 as number | null,
  keyboard = true,
  listSearch = '?q=night%3E0&sortBy=totalTime',
} = {}) {
  return render(
    <MemoryRouter initialEntries={[`/flights/${flightId}`]}>
      <Routes>
        <Route
          path="/flights/:flightId"
          element={
            <>
              <FlightNeighborNav flightId={flightId} listSearch={listSearch} listIndex={listIndex ?? undefined} keyboard={keyboard} />
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

  it('reads the list page holding the flight, with the list query', () => {
    const spy = serveList();
    renderNav({ flightId: 'f25', listIndex: 25 });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 20, q: 'night>0', sortBy: 'totalTime' }),
      expect.objectContaining({ enabled: true })
    );
    expect(screen.getByText('26 of 45')).toBeInTheDocument();
  });

  it('steps to the next flight and carries its position and the list query', async () => {
    serveList();
    renderNav();

    await userEvent.click(screen.getByRole('button', { name: 'Next flight' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/flights/f6|?q=night%3E0&sortBy=totalTime|6');
  });

  it('crosses a page boundary using the neighbouring page', async () => {
    serveList();
    renderNav({ flightId: 'f19', listIndex: 19 });

    await userEvent.click(screen.getByRole('button', { name: 'Next flight' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/flights/f20');
  });

  it('disables the buttons at either end of the list', () => {
    serveList();
    const { unmount } = renderNav({ flightId: 'f0', listIndex: 0 });
    expect(screen.getByRole('button', { name: 'Previous flight' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next flight' })).toBeEnabled();
    unmount();

    renderNav({ flightId: 'f44', listIndex: 44 });
    expect(screen.getByRole('button', { name: 'Next flight' })).toBeDisabled();
  });

  it('follows the left and right arrow keys', () => {
    serveList();
    renderNav();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('location')).toHaveTextContent('/flights/f4|?q=night%3E0&sortBy=totalTime|4');
  });

  it('leaves arrow keys alone while typing, with modifiers, or when switched off', () => {
    serveList();
    const { unmount } = renderNav();

    fireEvent.keyDown(screen.getByLabelText('notes'), { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true });
    expect(screen.getByTestId('location')).toHaveTextContent('/flights/f5');
    unmount();

    renderNav({ keyboard: false });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('location')).toHaveTextContent('/flights/f5');
  });

  it('hides without a list position, e.g. on a direct link', () => {
    serveList();
    renderNav({ listIndex: null });

    expect(screen.queryByTestId('flight-neighbor-nav')).not.toBeInTheDocument();
  });

  it('hides when the list no longer has the flight at that position', () => {
    serveList();
    renderNav({ flightId: 'f5', listIndex: 7 });

    expect(screen.queryByTestId('flight-neighbor-nav')).not.toBeInTheDocument();
  });

  it('does not trust a placeholder page shown while the real one loads', () => {
    serveList({ placeholder: true });
    renderNav();

    expect(screen.queryByTestId('flight-neighbor-nav')).not.toBeInTheDocument();
  });
});
