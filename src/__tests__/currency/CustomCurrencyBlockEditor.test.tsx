import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomCurrencyBlockEditor } from '../../components/currency/CustomCurrencyBlockEditor';
import type { CustomRuleInput } from '../../types/customCurrency';

function baseInput(): CustomRuleInput {
  return {
    name: 'Night landings',
    emoji: '🌙',
    description: null,
    definition: {
      window: { amount: 90, unit: 'days' },
      filters: [{ field: 'has_night', op: 'is_true' }],
      requirements: [{ metric: 'night_landings', min: 3 }],
    },
  };
}

/** Render helper that keeps the latest value the editor emitted. */
function setup(initial: CustomRuleInput) {
  const onChange = vi.fn();
  render(<CustomCurrencyBlockEditor value={initial} onChange={onChange} />);
  return { onChange };
}

describe('CustomCurrencyBlockEditor', () => {
  it('renders the rule name and requirement blocks', () => {
    setup(baseInput());
    expect((screen.getByTestId('block-name') as HTMLInputElement).value).toBe('Night landings');
    expect(screen.getByTestId('requirement-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('filter-row-0')).toBeInTheDocument();
  });

  it('emits an updated name on typing', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(baseInput());
    await user.type(screen.getByTestId('block-name'), '!');
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as CustomRuleInput;
    // Controlled input: the parent didn't update `value`, so each keystroke maps
    // the original name plus the typed char.
    expect(last.name).toBe('Night landings!');
  });

  it('adds a requirement when clicking Add requirement', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(baseInput());
    await user.click(screen.getByRole('button', { name: /add requirement/i }));
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as CustomRuleInput;
    expect(last.definition.requirements).toHaveLength(2);
  });

  it('adds a unit when switching a requirement to a time metric', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(baseInput());
    await user.selectOptions(screen.getByLabelText('Metric'), 'pic_time');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as CustomRuleInput;
    expect(last.definition.requirements[0]).toMatchObject({ metric: 'pic_time', unit: 'hours' });
  });

  it('adds a filter with a default field', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(baseInput());
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as CustomRuleInput;
    expect(last.definition.filters).toHaveLength(2);
    expect(last.definition.filters![last.definition.filters!.length - 1]).toMatchObject({ field: 'aircraft_class', op: 'eq' });
  });
});
