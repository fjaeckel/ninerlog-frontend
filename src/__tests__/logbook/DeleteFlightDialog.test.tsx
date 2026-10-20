import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteFlightDialog } from '../../components/logbook/DeleteFlightDialog';

const mode = { value: 'standard' as 'strict' | 'standard' | 'unknown' };
vi.mock('../../hooks/useLogbook', () => ({ useLogbookStrictness: () => mode.value }));

describe('DeleteFlightDialog', () => {
  it('is a plain confirmation in standard mode', async () => {
    mode.value = 'standard';
    const onConfirm = vi.fn();
    render(<DeleteFlightDialog open onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('takes an optional void reason in strict mode', async () => {
    mode.value = 'strict';
    const onConfirm = vi.fn();
    render(<DeleteFlightDialog open onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByText(/leaves your logbook and is kept as a void record/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /close/i })).toHaveFocus());
    await userEvent.type(screen.getByRole('textbox', { name: /reason/i }), ' Duplicate ');
    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(onConfirm).toHaveBeenCalledWith('Duplicate');
  });

  it('sends no reason when the field is left blank', async () => {
    mode.value = 'strict';
    const onConfirm = vi.fn();
    render(<DeleteFlightDialog open onCancel={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('offers the reason field with neutral wording while the logbook mode is unknown', async () => {
    mode.value = 'unknown';
    const onConfirm = vi.fn();
    render(<DeleteFlightDialog open onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(
      screen.getByText('Delete this flight? If strict logbook mode is on, it is kept as a void record.')
    ).toBeInTheDocument();
    expect(screen.getByText(/if strict logbook mode is on, the reason is kept/i)).toBeInTheDocument();
    expect(screen.queryByText(/leaves your logbook/i)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /close/i })).toHaveFocus());
    await userEvent.type(screen.getByRole('textbox', { name: /reason/i }), 'Duplicate');
    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(onConfirm).toHaveBeenCalledWith('Duplicate');
  });

  it.each([
    ['strict', { error: 'This flight is locked', httpStatus: 409 }, /locked by a completed signature/i],
    ['strict', { error: 'reason is too long', httpStatus: 400 }, /reason is too long\. use at most 500/i],
    ['strict', { error: 'Failed to delete flight', httpStatus: 500 }, /could not delete the flight/i],
    ['standard', { error: 'Failed to delete flight', httpStatus: 500 }, /could not delete the flight/i],
  ] as const)('shows a %s-mode failure inline and stays open for a retry', async (m, err, message) => {
    mode.value = m;
    const onCancel = vi.fn();
    const onConfirm = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce(undefined);
    render(<DeleteFlightDialog open onCancel={onCancel} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole(m === 'strict' ? 'dialog' : 'alertdialog')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
