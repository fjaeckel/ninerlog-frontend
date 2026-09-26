import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AircraftRemindersSection, ReminderStatusBadge } from '../../components/aircraft/AircraftReminders';
import * as remindersHook from '../../hooks/useAircraftReminders';
import type { AircraftReminder } from '../../hooks/useAircraftReminders';

const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const complete = vi.fn();

const mutation = (fn: ReturnType<typeof vi.fn>) => ({ mutateAsync: fn, isPending: false }) as never;

const renderSection = (reminders: AircraftReminder[] | undefined, loadError = false) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AircraftRemindersSection aircraftId="a5" registration="D-MIKA" reminders={reminders} loadError={loadError} />
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

/** The open dialog, once its initial focus has settled. */
const openedDialog = async () => {
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => {
    if (!dialog.contains(document.activeElement)) throw new Error('dialog not focused yet');
  });
  return dialog;
};

const base = {
  aircraftId: 'a5',
  aircraftRegistration: 'D-MIKA',
  createdAt: '2025-09-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const annual: AircraftReminder = {
  ...base, id: 'r1', kind: 'ANNUAL_INSPECTION', dueDate: '2026-08-28', status: 'due_soon', daysUntilDue: 12,
  intervalMonths: 12, lastDoneOn: '2025-08-28',
};
const repack: AircraftReminder = {
  ...base, id: 'r2', kind: 'RESCUE_SYSTEM_REPACK', dueDate: '2026-08-11', status: 'overdue', daysUntilDue: -5,
  notes: 'Junkers Magnum 450',
};
const custom: AircraftReminder = {
  ...base, id: 'r3', kind: 'CUSTOM', label: 'Transponder check', dueDate: '2027-02-01', status: 'ok', daysUntilDue: 169,
};

describe('AircraftRemindersSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-16T10:00:00Z'));
    vi.clearAllMocks();
    create.mockResolvedValue({});
    update.mockResolvedValue({});
    remove.mockResolvedValue(undefined);
    complete.mockResolvedValue({});
    vi.spyOn(remindersHook, 'useCreateAircraftReminder').mockReturnValue(mutation(create));
    vi.spyOn(remindersHook, 'useUpdateAircraftReminder').mockReturnValue(mutation(update));
    vi.spyOn(remindersHook, 'useDeleteAircraftReminder').mockReturnValue(mutation(remove));
    vi.spyOn(remindersHook, 'useCompleteAircraftReminder').mockReturnValue(mutation(complete));
  });
  afterEach(() => vi.useRealTimers());

  it('M-job3: lists kind, due date, status, days, interval, last done and notes', () => {
    renderSection([repack, annual, custom]);
    expect(screen.getByText('Reminders')).toBeInTheDocument();
    expect(screen.getByText('Rescue system repack')).toBeInTheDocument();
    expect(screen.getByText('Annual inspection')).toBeInTheDocument();
    expect(screen.getByText('Transponder check')).toBeInTheDocument();
    expect(screen.getByText(/5 days overdue/)).toBeInTheDocument();
    expect(screen.getByText(/in 12 days/)).toBeInTheDocument();
    expect(screen.getByText(/every 12 months/)).toBeInTheDocument();
    expect(screen.getByText(/Last done/)).toBeInTheDocument();
    expect(screen.getByText('Junkers Magnum 450')).toBeInTheDocument();
  });

  it('shows only an add action when the aircraft has no reminders', () => {
    renderSection([]);
    expect(screen.queryByText('Reminders')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add reminder' })).toBeInTheDocument();
  });

  it('renders nothing actionable while loading and an error when loading failed', () => {
    const { unmount } = renderSection(undefined);
    expect(screen.queryByRole('button', { name: 'Add reminder' })).not.toBeInTheDocument();
    unmount();
    renderSection(undefined, true);
    expect(screen.getByText('Could not load reminders.')).toBeInTheDocument();
  });

  it('prefills 12 months for an annual inspection and creates the reminder', async () => {
    const user = userEvent.setup();
    renderSection([]);
    await user.click(screen.getByRole('button', { name: 'Add reminder' }));
    const dialog = await openedDialog();
    expect(within(dialog).getByLabelText('Kind')).toHaveValue('ANNUAL_INSPECTION');
    expect(within(dialog).getByLabelText('Interval (months)')).toHaveValue(12);
    expect(within(dialog).getByText(/DAeC\/DULV Jahresnachprüfung/)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Due date'), '2027-05-31');
    await user.click(within(dialog).getByRole('button', { name: 'Save reminder' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        aircraftId: 'a5',
        data: { kind: 'ANNUAL_INSPECTION', dueDate: '2027-05-31', intervalMonths: 12 },
      }),
    );
  });

  it('clears the interval and points to the manual for rescue-system kinds', async () => {
    const user = userEvent.setup();
    renderSection([]);
    await user.click(screen.getByRole('button', { name: 'Add reminder' }));
    const dialog = await openedDialog();
    await user.selectOptions(within(dialog).getByLabelText('Kind'), 'RESCUE_ROCKET_EXPIRY');
    expect(within(dialog).getByLabelText('Interval (months)')).toHaveValue(null);
    expect(within(dialog).getByText("Per the manufacturer's manual.")).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText('Kind'), 'INSURANCE');
    expect(within(dialog).getByLabelText('Interval (months)')).toHaveValue(12);
    await user.selectOptions(within(dialog).getByLabelText('Kind'), 'ELT_BATTERY');
    expect(within(dialog).getByLabelText('Interval (months)')).toHaveValue(null);
  });

  it('requires a label for a custom reminder and a due date', async () => {
    const user = userEvent.setup();
    renderSection([]);
    await user.click(screen.getByRole('button', { name: 'Add reminder' }));
    const dialog = await openedDialog();
    await user.selectOptions(within(dialog).getByLabelText('Kind'), 'CUSTOM');
    await user.click(within(dialog).getByRole('button', { name: 'Save reminder' }));
    expect(await within(dialog).findByText('A custom reminder needs a label.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a due date.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('edits a reminder and clears emptied fields with null', async () => {
    const user = userEvent.setup();
    renderSection([annual]);
    await user.click(screen.getByRole('button', { name: 'Edit Annual inspection' }));
    const dialog = await openedDialog();
    expect(within(dialog).getByLabelText('Due date')).toHaveValue('2026-08-28');
    await user.clear(within(dialog).getByLabelText('Interval (months)'));
    await user.type(within(dialog).getByLabelText('Notes'), 'At the DULV inspector');
    await user.click(within(dialog).getByRole('button', { name: 'Save reminder' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        aircraftId: 'a5',
        reminderId: 'r1',
        data: {
          kind: 'ANNUAL_INSPECTION',
          label: null,
          dueDate: '2026-08-28',
          intervalMonths: null,
          lastDoneOn: '2025-08-28',
          notes: 'At the DULV inspector',
        },
      }),
    );
  });

  it('marks done with today as the default date', async () => {
    const user = userEvent.setup();
    renderSection([annual]);
    await user.click(screen.getByRole('button', { name: 'Mark done' }));
    const dialog = await openedDialog();
    expect(within(dialog).getByLabelText('Done on')).toHaveValue('2026-08-16');
    expect(within(dialog).getByText('The next due date is set 12 months after this date.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Mark done' }));
    await waitFor(() =>
      expect(complete).toHaveBeenCalledWith({ aircraftId: 'a5', reminderId: 'r1', doneOn: '2026-08-16' }),
    );
  });

  it('tells the pilot to set the next date when there is no interval', async () => {
    const user = userEvent.setup();
    renderSection([repack]);
    await user.click(screen.getByRole('button', { name: 'Mark done' }));
    expect(await screen.findByText(/No interval set/)).toBeInTheDocument();
  });

  it('deletes only after confirmation', async () => {
    const user = userEvent.setup();
    renderSection([repack]);
    await user.click(screen.getByRole('button', { name: 'Delete Rescue system repack' }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText('Rescue system repack on D-MIKA will be removed.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith({ aircraftId: 'a5', reminderId: 'r2' }));
  });
});

describe('ReminderStatusBadge', () => {
  it.each([
    ['ok', 'OK', 'badge-current'],
    ['due_soon', 'Due soon', 'badge-expiring'],
    ['overdue', 'Overdue', 'badge-expired'],
  ] as const)('%s renders "%s" with %s', (status, text, cls) => {
    render(<ReminderStatusBadge status={status} />);
    const badge = screen.getByText(text);
    expect(badge).toHaveClass(cls);
    expect(badge.querySelector('svg')).not.toBeNull();
  });
});
