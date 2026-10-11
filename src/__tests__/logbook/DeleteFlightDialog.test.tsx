import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteFlightDialog } from '../../components/logbook/DeleteFlightDialog';

const strict = { value: false };
vi.mock('../../hooks/useLogbook', () => ({ useIsStrictLogbook: () => strict.value }));

describe('DeleteFlightDialog', () => {
  it('is a plain confirmation in standard mode', async () => {
    strict.value = false;
    const onConfirm = vi.fn();
    render(<DeleteFlightDialog open onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(onConfirm).toHaveBeenCalledWith();
  });

  it('takes an optional void reason in strict mode', async () => {
    strict.value = true;
    const onConfirm = vi.fn();
    render(<DeleteFlightDialog open onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByText(/leaves your logbook and is kept as a void record/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /close/i })).toHaveFocus());
    await userEvent.type(screen.getByRole('textbox', { name: /reason/i }), ' Duplicate ');
    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(onConfirm).toHaveBeenCalledWith('Duplicate');
  });

  it('sends no reason when the field is left blank', async () => {
    strict.value = true;
    const onConfirm = vi.fn();
    render(<DeleteFlightDialog open onCancel={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: /delete flight/i }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });
});
