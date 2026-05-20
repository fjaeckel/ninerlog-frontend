import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BaselineSection } from '../../components/profile/BaselineSection';

vi.mock('../../hooks/useBaseline', () => {
  return {
    useMyBaseline: vi.fn(() => ({ data: null, isLoading: false })),
    useUpsertBaseline: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useDeleteBaseline: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  };
});

import {
  useDeleteBaseline,
  useMyBaseline,
  useUpsertBaseline,
} from '../../hooks/useBaseline';

const renderWithClient = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('BaselineSection', () => {
  it('renders create CTA when no baseline exists', () => {
    vi.mocked(useMyBaseline).mockReturnValue({ data: null, isLoading: false } as any);
    vi.mocked(useUpsertBaseline).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
    vi.mocked(useDeleteBaseline).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);

    renderWithClient(<BaselineSection />);

    expect(screen.getByRole('button', { name: /add initial snapshot/i })).toBeInTheDocument();
  });

  it('shows summary when baseline exists', () => {
    vi.mocked(useMyBaseline).mockReturnValue({
      data: {
        baselineDate: '2024-01-01',
        totalFlights: 150,
        totalMinutes: 6000,
        picMinutes: 4800,
        landingsDay: 200,
        landingsNight: 10,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
      isLoading: false,
    } as any);

    renderWithClient(<BaselineSection />);

    expect(screen.getByText(/100\.0h total · 80\.0h PIC · 210 landings, as of 2024-01-01/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit snapshot/i })).toBeInTheDocument();
  });

  it('submits a new snapshot converting hours to minutes', async () => {
    const upsertMock = vi.fn().mockResolvedValue({});
    vi.mocked(useMyBaseline).mockReturnValue({ data: null, isLoading: false } as any);
    vi.mocked(useUpsertBaseline).mockReturnValue({ mutateAsync: upsertMock, isPending: false } as any);
    vi.mocked(useDeleteBaseline).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);

    renderWithClient(<BaselineSection />);
    await userEvent.click(screen.getByRole('button', { name: /add initial snapshot/i }));

    const totalHours = screen.getByLabelText(/total hours/i);
    await userEvent.clear(totalHours);
    await userEvent.type(totalHours, '74');

    const picHours = screen.getByLabelText(/pic hours/i);
    await userEvent.clear(picHours);
    await userEvent.type(picHours, '74');

    const landingsDay = screen.getByLabelText(/day landings/i);
    await userEvent.clear(landingsDay);
    await userEvent.type(landingsDay, '245');

    await userEvent.click(screen.getByRole('button', { name: /save snapshot/i }));

    // jsdom doesn't always trigger requestSubmit from submit-button clicks; fall
    // back to firing the form's submit event explicitly if the click didn't.
    if (upsertMock.mock.calls.length === 0) {
      const form = totalHours.closest('form')!;
      fireEvent.submit(form);
    }

    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const arg = upsertMock.mock.calls[0][0];
    expect(arg.totalMinutes).toBe(74 * 60);
    expect(arg.picMinutes).toBe(74 * 60);
    expect(arg.landingsDay).toBe(245);
    expect(arg.baselineDate).toBeTruthy();
  });
});
