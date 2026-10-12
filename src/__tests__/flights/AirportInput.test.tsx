import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AirportInput } from '../../components/flights/AirportInput';

const airports = [
  { icao: 'DE-0249', name: 'Konz-Könen Glider Field', latitude: 49.68, longitude: 6.54, country: 'DE' },
  { icao: 'EDRK', name: 'Koblenz-Winningen Airfield', latitude: 50.33, longitude: 7.53, country: 'DE' },
  { icao: 'FR-0009', name: 'Altisurface Notre-Dame', latitude: 45, longitude: 6, country: 'FR', localCode: 'LF0723' },
];

vi.mock('../../hooks/useDebounced', () => ({ useDebounced: <T,>(v: T) => v }));
vi.mock('../../hooks/useMaps', () => ({
  useAirportSearch: (q: string) => ({ data: q.length >= 2 ? airports : undefined }),
  useAirport: (code: string, enabled: boolean) => ({
    data: enabled ? airports.find((a) => a.icao === code) : undefined,
  }),
}));

function Harness({ onValue, initial = '' }: { onValue: (v: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="dep">Departure</label>
      <AirportInput id="dep" value={value} onChange={(v) => { setValue(v); onValue(v); }} />
    </>
  );
}

describe('AirportInput', () => {
  it('stores the identifier of a field without an ICAO code and shows its name in the field', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await user.type(screen.getByRole('combobox', { name: 'Departure' }), 'kon');
    await user.click(screen.getByRole('option', { name: /Konz-Könen Glider Field/ }));

    expect(onValue).toHaveBeenLastCalledWith('DE-0249');
    expect(screen.getByRole('combobox', { name: 'Departure' })).toHaveValue('Konz-Könen Glider Field');
    expect(screen.queryByText('DE-0249')).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('keeps an ICAO code in the field and shows the name below it', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await user.type(screen.getByRole('combobox', { name: 'Departure' }), 'kob');
    await user.click(screen.getByRole('option', { name: /Koblenz-Winningen Airfield/ }));

    expect(onValue).toHaveBeenLastCalledWith('EDRK');
    expect(screen.getByRole('combobox', { name: 'Departure' })).toHaveValue('EDRK');
    expect(screen.getByText('Koblenz-Winningen Airfield')).toBeInTheDocument();
  });

  it('shows a stored local identifier by its airport name', () => {
    render(<Harness onValue={vi.fn()} initial="DE-0249" />);
    expect(screen.getByRole('combobox', { name: 'Departure' })).toHaveValue('Konz-Könen Glider Field');
  });

  it('picks with the keyboard and shows the local code', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await user.type(screen.getByRole('combobox', { name: 'Departure' }), 'lf07');
    expect(screen.getByText('LF0723')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');

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
