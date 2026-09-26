import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TimeOfDayInput } from '../../components/ui/TimeOfDayInput';
import type { ClockFormat } from '../../lib/timeOfDay';

function Harness({ initial, clockFormat, onCommit }: { initial: string; clockFormat: ClockFormat; onCommit?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="t">Time</label>
      <TimeOfDayInput
        id="t"
        value={value}
        clockFormat={clockFormat}
        onChange={(v) => {
          setValue(v);
          onCommit?.(v);
        }}
      />
      <output data-testid="stored">{value}</output>
    </>
  );
}

describe('TimeOfDayInput', () => {
  it('renders the stored value in 24-hour format as a text field', () => {
    render(<Harness initial="14:30" clockFormat="24h" />);
    const input = screen.getByLabelText('Time') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.value).toBe('14:30');
  });

  it('renders the stored value in 12-hour format', () => {
    render(<Harness initial="14:30" clockFormat="12h" />);
    expect((screen.getByLabelText('Time') as HTMLInputElement).value).toBe('2:30 PM');
  });

  it('commits shorthand as canonical HH:MM on blur', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness initial="" clockFormat="24h" onCommit={onCommit} />);
    await user.type(screen.getByLabelText('Time'), '0915');
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith('09:15');
    expect(screen.getByTestId('stored').textContent).toBe('09:15');
    expect((screen.getByLabelText('Time') as HTMLInputElement).value).toBe('09:15');
  });

  it('stores 24-hour even when entered and shown as 12-hour', async () => {
    const user = userEvent.setup();
    render(<Harness initial="" clockFormat="12h" />);
    await user.type(screen.getByLabelText('Time'), '6:45 pm{Enter}');
    expect(screen.getByTestId('stored').textContent).toBe('18:45');
    expect((screen.getByLabelText('Time') as HTMLInputElement).value).toBe('6:45 PM');
  });

  it('keeps unparseable text so the form can flag it', async () => {
    const user = userEvent.setup();
    render(<Harness initial="" clockFormat="24h" />);
    await user.type(screen.getByLabelText('Time'), '25:00');
    await user.tab();
    expect(screen.getByTestId('stored').textContent).toBe('25:00');
    expect((screen.getByLabelText('Time') as HTMLInputElement).value).toBe('25:00');
  });

  it('clears the value when emptied', async () => {
    const user = userEvent.setup();
    render(<Harness initial="10:00" clockFormat="24h" />);
    await user.clear(screen.getByLabelText('Time'));
    await user.tab();
    expect(screen.getByTestId('stored').textContent).toBe('');
  });
});
