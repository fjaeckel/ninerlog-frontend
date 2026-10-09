import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AirportInput } from '../../components/flights/AirportInput';

const airports = [
  { icao: 'DE-0249', name: 'Konz-Könen Glider Field', latitude: 49.68, longitude: 6.54, country: 'DE' },
  { icao: 'FR-0009', name: 'Altisurface Notre-Dame', latitude: 45, longitude: 6, country: 'FR', localCode: 'LF0723' },
];

vi.mock('../../hooks/useDebounced', () => ({ useDebounced: <T,>(v: T) => v }));
vi.mock('../../hooks/useMaps', () => ({
  useAirportSearch: (q: string) => ({ data: q.length >= 2 ? airports : undefined }),
}));

function Harness({ onValue }: { onValue: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="dep">Departure</label>
      <AirportInput id="dep" value={value} onChange={(v) => { setValue(v); onValue(v); }} />
    </>
  );
}

describe('AirportInput', () => {
  it('stores the identifier of the airport picked with the mouse and shows its name', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await user.type(screen.getByRole('combobox', { name: 'Departure' }), 'kon');
    await user.click(screen.getByRole('option', { name: /Konz-Könen Glider Field/ }));

    expect(onValue).toHaveBeenLastCalledWith('DE-0249');
    expect(screen.getByRole('combobox', { name: 'Departure' })).toHaveValue('DE-0249');
    expect(screen.getByText('Konz-Könen Glider Field')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('picks with the keyboard and shows the local code', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await user.type(screen.getByRole('combobox', { name: 'Departure' }), 'lf07');
    expect(screen.getByText('LF0723')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onValue).toHaveBeenLastCalledWith('FR-0009');
  });

  it('keeps free text when nothing is picked', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    const input = screen.getByRole('combobox', { name: 'Departure' });
    await user.type(input, 'Meadow strip');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('Meadow strip');
    expect(onValue).toHaveBeenLastCalledWith('Meadow strip');
  });
});
