import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ToastStack, ToastStackProvider } from '../../components/layout/ToastStack';
import { ToolkitToast } from '../../components/relevance/ToolkitToast';
import { FlightSavedNotice } from '../../components/flights/FlightSavedNotice';
import { gliderProfile } from '../../test/pilotProfile';

vi.mock('../../hooks/usePilotProfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/usePilotProfile')>();
  return {
    ...actual,
    usePilotProfile: () => ({ data: gliderProfile({ pendingAcknowledgement: ['SAILPLANE'] }) }),
    useUpdatePilotProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

describe('ToastStack', () => {
  it('stacks a page notice and the toolkit toast in one fixed column', () => {
    render(
      <ToastStackProvider>
        <main>
          <FlightSavedNotice saved={{ count: 1 }} onDismiss={vi.fn()} />
        </main>
        <ToastStack>
          <ToolkitToast />
        </ToastStack>
      </ToastStackProvider>,
    );
    const stack = screen.getByTestId('toast-stack');
    expect(stack).toHaveClass('fixed', 'flex', 'flex-col', 'gap-2');
    const notice = within(stack).getByTestId('flight-saved-notice');
    const toolkit = within(stack).getByTestId('toolkit-toast-SAILPLANE');
    expect(notice).not.toHaveClass('fixed');
    expect(toolkit.closest('section')).not.toHaveClass('fixed');
    expect(document.querySelectorAll('.fixed')).toHaveLength(1);
  });

  it('keeps a notice positioned outside a stack', () => {
    render(<FlightSavedNotice saved={{ count: 1 }} onDismiss={vi.fn()} />);
    expect(screen.getByTestId('flight-saved-notice').parentElement).toHaveClass('fixed');
  });
});
