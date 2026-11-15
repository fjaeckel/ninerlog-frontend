import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightForm from '../../components/flights/FlightForm';
import * as flights from '../../hooks/useFlights';
import * as aircraft from '../../hooks/useAircraft';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  const ok = () => Promise.resolve({ data: undefined, error: undefined, response: new Response() });
  return { ...actual, apiClient: { GET: vi.fn(ok), POST: vi.fn(ok), PUT: vi.fn(ok), PATCH: vi.fn(ok), DELETE: vi.fn(ok) } };
});

const create = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const update = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const existing = {
  id: 'f1', userId: 'u1', date: '2026-11-14', aircraftReg: 'N12345', aircraftType: 'C172',
  departureIcao: 'KORD', arrivalIcao: 'KORD', flightTimeMethod: 'hobbs',
  hobbsStartTenths: 15234, hobbsEndTenths: 15247, totalTime: 78, allLandings: 1,
  ifrTime: 0, crewMembers: [], remarks: 'Original', distance: 0,
};
const renderForm = (flightId?: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter><FlightForm flightId={flightId} onClose={vi.fn()} /></BrowserRouter>
  </QueryClientProvider>,
);
const change = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.submit(screen.getByRole('button', { name: /^(log flight|update flight|log session)$/i }).closest('form')!);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: { id: 'u1', email: 'pilot@example.test', name: 'Pilot', createdAt: '', updatedAt: '', defaultFlightTimeMethod: 'hobbs', decimalSeparator: 'dot' } });
  vi.spyOn(flights, 'useCreateFlight').mockReturnValue(create as never);
  vi.spyOn(flights, 'useUpdateFlight').mockReturnValue(update as never);
  vi.spyOn(flights, 'useFlights').mockReturnValue({ data: { data: [] } } as never);
  vi.spyOn(flights, 'useFlight').mockReturnValue({ data: undefined } as never);
  vi.spyOn(aircraft, 'useAircraft').mockReturnValue({ data: [{ id: 'a1', registration: 'N12345', type: 'C172', isActive: true }] } as never);
  vi.spyOn(aircraft, 'useCreateAircraft').mockReturnValue({ mutateAsync: vi.fn() } as never);
});
afterEach(() => { cleanup(); useAuthStore.setState({ user: null }); vi.restoreAllMocks(); });

describe('Hobbs flight form', () => {
  it('T1: uses the saved default and submits original readings without block times', async () => {
    expect(useAuthStore.getState().user?.defaultFlightTimeMethod).toBe('hobbs');
    renderForm();
    expect(screen.getByLabelText(/flight time tracking method/i)).toHaveValue('hobbs');
    change(/aircraft registration/i, 'N12345');
    change(/^departure/i, 'KORD'); change(/^arrival/i, 'KORD');
    change(/hobbs start/i, '1523.4'); change(/hobbs end/i, '1524.7');
    expect(screen.getByRole('status')).toHaveTextContent('1h 18m');
    submit();
    await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledOnce());
    expect(create.mutateAsync.mock.calls[0][0]).toMatchObject({ flightTimeMethod: 'hobbs', hobbsStartTenths: 15234, hobbsEndTenths: 15247 });
    expect(create.mutateAsync.mock.calls[0][0].offBlockTime).toBeUndefined();
    expect(create.mutateAsync.mock.calls[0][0].onBlockTime).toBeUndefined();
  });
  it('rejects reversed readings with a clear message', async () => {
    renderForm(); change(/hobbs start/i, '1524.7'); change(/hobbs end/i, '1523.4'); submit();
    expect(await screen.findByText('Hobbs End must be greater than Hobbs Start.')).toBeInTheDocument();
    expect(create.mutateAsync).not.toHaveBeenCalled();
  });
  it('A2/R2: block overrides need no meter readings and do not change the preference', () => {
    renderForm(); change(/flight time tracking method/i, 'block');
    expect(screen.queryByLabelText(/hobbs start/i)).not.toBeInTheDocument();
    expect(useAuthStore.getState().user?.defaultFlightTimeMethod).toBe('hobbs');
  });
  it('H1: loads the saved method even when the global default is block and omits unchanged timing', async () => {
    useAuthStore.getState().updateUser({ defaultFlightTimeMethod: 'block' });
    vi.spyOn(flights, 'useFlight').mockReturnValue({ data: existing } as never);
    renderForm('f1');
    expect(await screen.findByDisplayValue('1523.4')).toBeInTheDocument();
    expect(screen.getByLabelText(/flight time tracking method/i)).toHaveValue('hobbs');
    change(/^remarks/i, 'Changed'); submit();
    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledOnce());
    const payload = update.mutateAsync.mock.calls[0][0].data;
    expect(payload.remarks).toBe('Changed');
    for (const key of ['totalTime', 'flightTimeMethod', 'hobbsStartTenths', 'hobbsEndTenths', 'offBlockTime', 'onBlockTime']) expect(payload).not.toHaveProperty(key);
  });
  it('keeps simulator entry free of Hobbs inputs', () => {
    renderForm(); fireEvent.click(screen.getByRole('radio', { name: /simulator session/i }));
    expect(screen.queryByLabelText(/hobbs start/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/flight time tracking method/i)).not.toBeInTheDocument();
  });
});

describe('decimal logbook entry', () => {
  beforeEach(() => useAuthStore.getState().updateUser({ defaultFlightTimeMethod: 'manual', timeDisplayFormat: 'decimal' }));
  const fillRequired = () => {
    change(/aircraft registration/i, 'N12345');
    change(/^departure/i, 'KORD'); change(/^arrival/i, 'KORD');
  };
  it('saves 1.5 flight, 1.5 dual, .5 simulated instrument and 1.1 PIC', async () => {
    renderForm(); fillRequired();
    change(/^total flight time/i, '1.5'); change(/^pic(?: time)?$/i, '1.1');
    change(/^dual received$/i, '1.5');
    fireEvent.click(screen.getByRole('button', { name: 'Instrument / IFR' }));
    change(/^simulated instrument/i, '.5');
    submit();
    await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledOnce());
    expect(create.mutateAsync.mock.calls[0][0]).toMatchObject({ flightTimeMethod:'manual', manualTotalTime:90, picTime:66, dualTime:90, simulatedInstrumentTime:30 });
    expect(create.mutateAsync.mock.calls[0][0].offBlockTime).toBeUndefined();
  });
  it('accepts comma decimal hours and explicit zero credit', async () => {
    useAuthStore.getState().updateUser({ decimalSeparator:'comma' });
    renderForm(); fillRequired(); change(/^total flight time/i,'1,5'); change(/^pic(?: time)?$/i,'0');
    submit(); await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledOnce());
    expect(create.mutateAsync.mock.calls[0][0]).toMatchObject({manualTotalTime:90,picTime:0});
    expect(create.mutateAsync.mock.calls[0][0]).not.toHaveProperty('dualTime');
  });
  it('focus and blur preserve an existing 83-minute duration exactly', async () => {
    vi.spyOn(flights,'useFlight').mockReturnValue({data:{...existing,flightTimeMethod:'manual',manualTotalTime:83,totalTime:83,hobbsStartTenths:undefined,hobbsEndTenths:undefined,picTime:66,picTimeOverride:true}} as never);
    renderForm('f1');
    const input = screen.getByLabelText(/^total flight time/i);
    expect(input).toHaveValue('1.38'); fireEvent.focus(input); fireEvent.blur(input);
    change(/^remarks/i,'Changed'); submit();
    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledOnce());
    expect(update.mutateAsync.mock.calls[0][0].data).not.toHaveProperty('manualTotalTime');
    expect(update.mutateAsync.mock.calls[0][0].data.picTime).toBe(66);
  });
  it('clearing a saved credit restores automatic calculation', async () => {
    vi.spyOn(flights,'useFlight').mockReturnValue({data:{...existing,picTime:66,picTimeOverride:true}} as never);
    renderForm('f1'); change(/^pic(?: time)?$/i,''); submit();
    await waitFor(() => expect(update.mutateAsync).toHaveBeenCalledOnce());
    expect(update.mutateAsync.mock.calls[0][0].data.picTime).toBeNull();
  });
  it.each(['block', 'hobbs', 'manual'] as const)('%s keeps pilot credit separate from the source and instrument fields', (method) => {
    renderForm(); change(/flight time tracking method/i, method);
    const source = screen.getByRole('group', { name: 'Flight Time Tracking Method' });
    const pilot = screen.getByRole('group', { name: 'Pilot time' });
    expect(pilot).toContainElement(screen.getByLabelText(/^pic(?: time)?$/i));
    expect(pilot).toContainElement(screen.getByLabelText(/^dual received$/i));
    expect(source).not.toContainElement(screen.getByLabelText(/^pic(?: time)?$/i));
    expect(screen.queryByLabelText(/^simulated instrument/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Instrument / IFR' }));
    const instrument = document.getElementById('instrument-fields');
    expect(instrument).toContainElement(screen.getByLabelText(/^simulated instrument/i));
    expect(instrument).toContainElement(screen.getByLabelText(/^actual instrument/i));
  });
  it('rejects invalid duration text', async () => {
    renderForm(); fillRequired(); change(/^total flight time/i,'1.5junk'); submit();
    expect(await screen.findByText('Enter decimal hours, for example 1.5 or .5.')).toBeInTheDocument();
    expect(create.mutateAsync).not.toHaveBeenCalled();
  });
  it('resetting invalid credit removes stale text and restores automatic entry', async () => {
    renderForm(); change(/^pic(?: time)?$/i,'junk');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/reset to auto/i}));
    await waitFor(() => expect(screen.getByLabelText(/^pic(?: time)?$/i)).toHaveValue(''));
    expect(screen.queryByText('Enter decimal hours, for example 1.5 or .5.')).not.toBeInTheDocument();
  });

  it('an invalid manual total does not block a valid block entry after switching method', async () => {
    renderForm(); fillRequired(); change(/^total flight time/i,'junk');
    change(/flight time tracking method/i,'block');
    change(/^off-block/i,'08:00'); fireEvent.blur(screen.getByLabelText(/^off-block/i));
    change(/^on-block/i,'09:30'); fireEvent.blur(screen.getByLabelText(/^on-block/i)); submit();
    await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledOnce());
    expect(create.mutateAsync.mock.calls[0][0].flightTimeMethod).toBe('block');
    expect(create.mutateAsync.mock.calls[0][0]).not.toHaveProperty('manualTotalTime');
  });
  it('invalid hidden flight credits do not block simulator entry', async () => {
    renderForm(); change(/^pic(?: time)?$/i,'junk'); change(/^total flight time/i,'junk');
    fireEvent.click(screen.getByRole('radio',{name:/simulator session/i}));
    change(/aircraft type/i,'C172'); change(/fstd.*type|device type/i,'FNPT II');
    change(/session.*time|simulated flight time/i,'1.5'); submit();
    await waitFor(() => expect(create.mutateAsync).toHaveBeenCalledOnce());
    expect(create.mutateAsync.mock.calls[0][0]).not.toHaveProperty('picTime');
  });

});
