import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import VoidedFlightsPage from '../../pages/flights/VoidedFlightsPage';

const state: { data: unknown[] } = { data: [] };
vi.mock('../../hooks/useLogbook', () => ({
  useVoidedFlights: () => ({ data: state.data, isLoading: false, error: null }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <VoidedFlightsPage />
    </MemoryRouter>
  );

describe('VoidedFlightsPage', () => {
  it('lists void records, each linking to its history', () => {
    state.data = [
      {
        flightId: 'fv1', revisionId: 'r5', deletedAt: '2026-08-13T10:00:00Z', reason: 'Duplicate entry',
        source: 'user_edit', isCorrection: false, date: '2026-08-09', aircraftReg: 'D-EABC',
        aircraftType: 'C172', departureIcao: 'EDDF', arrivalIcao: 'EDDH', totalTime: 95, remarks: null,
      },
    ];
    renderPage();
    const table = screen.getByRole('table', { name: /voided entries/i });
    expect(within(table).getByText('Duplicate entry')).toBeInTheDocument();
    expect(within(table).getByText('EDDF → EDDH')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: /history of the flight/i })).toHaveAttribute(
      'href',
      '/flights/fv1/history'
    );
  });

  it('shows an empty state', () => {
    state.data = [];
    renderPage();
    expect(screen.getByText('No voided entries')).toBeInTheDocument();
  });
});
