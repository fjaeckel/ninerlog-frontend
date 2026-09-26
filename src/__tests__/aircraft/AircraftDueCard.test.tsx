import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AircraftDueCard } from '../../components/aircraft/AircraftDueCard';
import * as remindersHook from '../../hooks/useAircraftReminders';

const renderCard = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<AircraftDueCard />} />
          <Route path="/aircraft" element={<p>Aircraft page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const mockList = (data: unknown) =>
  vi.spyOn(remindersHook, 'useAllAircraftReminders').mockReturnValue({ data, isLoading: false } as never);

const base = { aircraftId: 'a5', createdAt: '', updatedAt: '' };

describe('AircraftDueCard', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('asks for reminders due within 30 days', () => {
    const spy = mockList([]);
    renderCard();
    expect(spy).toHaveBeenCalledWith(30);
  });

  it('R/A2: renders nothing for a pilot without reminders', () => {
    mockList([]);
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while loading', () => {
    mockList(undefined);
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });

  it('M-job3: lists due-soon and overdue reminders and links to the aircraft page', async () => {
    mockList([
      { ...base, id: 'r2', aircraftRegistration: 'D-MIKA', kind: 'RESCUE_SYSTEM_REPACK', dueDate: '2026-08-11', status: 'overdue', daysUntilDue: -5 },
      { ...base, id: 'r1', aircraftRegistration: 'D-MIKA', kind: 'ANNUAL_INSPECTION', dueDate: '2026-08-28', status: 'due_soon', daysUntilDue: 12 },
    ]);
    renderCard();
    expect(screen.getByRole('heading', { name: 'Aircraft due soon' })).toBeInTheDocument();
    expect(screen.getByText('Rescue system repack')).toBeInTheDocument();
    expect(screen.getByText('Annual inspection')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Due soon')).toBeInTheDocument();
    expect(screen.getByText(/5 days overdue/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByText('Annual inspection'));
    expect(screen.getByText('Aircraft page')).toBeInTheDocument();
  });

  it('leaves out reminders that are not yet due', () => {
    mockList([
      { ...base, id: 'r4', aircraftRegistration: 'D-MIKA', kind: 'INSURANCE', dueDate: '2026-12-31', status: 'ok', daysUntilDue: 137 },
    ]);
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });
});
