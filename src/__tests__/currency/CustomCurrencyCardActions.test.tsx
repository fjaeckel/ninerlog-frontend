import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomCurrencyCard } from '../../components/currency/CustomCurrencyCard';
import type { CustomRuleWithStatus } from '../../types/customCurrency';

function item(overrides = {}): CustomRuleWithStatus {
  return {
    rule: {
      id: 'r1', userId: 'u1', name: 'Night landings', emoji: '🌙',
      description: null, enabled: true, isShared: false, createdAt: '', updatedAt: '',
      definition: { window: { amount: 90, unit: 'days' }, requirements: [{ metric: 'night_landings', min: 3 }] },
      ...overrides,
    },
    evaluation: {
      status: 'expired', windowLabel: 'last 90 days', evaluatedAt: '',
      requirements: [{ name: 'Night landings', met: false, current: 0, required: 3, unit: '', message: '0 / 3' }],
    },
  };
}

describe('CustomCurrencyCard actions', () => {
  it('does not render action icons when no handlers are given', () => {
    render(<CustomCurrencyCard item={item()} />);
    expect(screen.queryByTestId('edit-custom-r1')).toBeNull();
    expect(screen.queryByTestId('share-custom-r1')).toBeNull();
    expect(screen.queryByTestId('delete-custom-r1')).toBeNull();
  });

  it('fires edit / share / delete handlers with the rule id', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn(), onShare = vi.fn(), onDelete = vi.fn();
    render(<CustomCurrencyCard item={item()} onEdit={onEdit} onShare={onShare} onDelete={onDelete} />);

    await user.click(screen.getByTestId('edit-custom-r1'));
    await user.click(screen.getByTestId('share-custom-r1'));
    await user.click(screen.getByTestId('delete-custom-r1'));

    expect(onEdit).toHaveBeenCalledWith('r1');
    expect(onShare).toHaveBeenCalledWith('r1');
    expect(onDelete).toHaveBeenCalledWith('r1');
  });

  it('marks the share icon active when the rule is already shared', () => {
    const onShare = vi.fn();
    render(<CustomCurrencyCard item={item({ isShared: true })} onShare={onShare} />);
    expect(screen.getByTestId('share-custom-r1').getAttribute('aria-label')).toMatch(/shared/i);
  });

  it('renders a paused state and toggles enabled with the new value', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<CustomCurrencyCard item={item({ enabled: false })} onToggleEnabled={onToggle} />);

    const card = screen.getByTestId('custom-currency-card-r1');
    expect(card.getAttribute('data-paused')).toBe('true');
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
    // Progress bars are hidden while paused.
    expect(screen.queryByTestId('custom-requirement-Night landings')).toBeNull();

    const toggle = screen.getByTestId('toggle-enabled-custom-r1');
    expect(toggle.getAttribute('aria-label')).toMatch(/resume/i);
    await user.click(toggle);
    // Currently paused → clicking resumes (enabled = true).
    expect(onToggle).toHaveBeenCalledWith('r1', true);
  });

  it('pauses an enabled rule (enabled = false) on toggle', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<CustomCurrencyCard item={item({ enabled: true })} onToggleEnabled={onToggle} />);
    const toggle = screen.getByTestId('toggle-enabled-custom-r1');
    expect(toggle.getAttribute('aria-label')).toMatch(/pause/i);
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledWith('r1', false);
  });
});
