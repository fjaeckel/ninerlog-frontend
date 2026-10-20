import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormModal } from '../../components/ui/FormModal';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

describe('nested dialogs', () => {
  it('Escape in a Dialog inside a FormModal closes only the Dialog', () => {
    const closeOuter = vi.fn();
    const closeInner = vi.fn();
    render(
      <FormModal open onClose={closeOuter} title="Edit flight">
        <Dialog open onClose={closeInner} title="Reason">
          <textarea aria-label="reason" />
        </Dialog>
      </FormModal>
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'reason' }), { key: 'Escape' });
    expect(closeInner).toHaveBeenCalledTimes(1);
    expect(closeOuter).not.toHaveBeenCalled();
  });

  it('Escape in a ConfirmDialog inside a FormModal closes only the ConfirmDialog', () => {
    const closeOuter = vi.fn();
    const cancelInner = vi.fn();
    render(
      <FormModal open onClose={closeOuter} title="Edit flight">
        <ConfirmDialog open onCancel={cancelInner} onConfirm={vi.fn()} title="Delete?" description="Sure?" />
      </FormModal>
    );
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(cancelInner).toHaveBeenCalledTimes(1);
    expect(closeOuter).not.toHaveBeenCalled();
  });

  it('Escape in a FormModal still closes it', () => {
    const closeOuter = vi.fn();
    render(
      <FormModal open onClose={closeOuter} title="Edit flight">
        <input aria-label="field" />
      </FormModal>
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'field' }), { key: 'Escape' });
    expect(closeOuter).toHaveBeenCalledTimes(1);
  });
});
