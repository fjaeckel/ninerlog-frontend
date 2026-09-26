import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IgcImport } from '../../components/flights/igc/IgcImport';
import type { IgcFlightPreview } from '../../hooks/useFlightFiles';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();

vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => getMock(...args),
    POST: (...args: unknown[]) => postMock(...args),
    PUT: (...args: unknown[]) => putMock(...args),
  },
  httpStatusOf: (e: unknown) => (e as { httpStatus?: number } | null)?.httpStatus,
}));

const MATCH_ID = '5b0c2a4e-8f1d-4c3a-9e2b-7d6f5a4c3b21';
const OTHER_ID = '0f9e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f';

/** P2: self-launched out-and-return ending in an outlanding (Petra, D-KXYZ). */
const petraP2 = (over: Partial<IgcFlightPreview> = {}): IgcFlightPreview => ({
  date: '2026-08-13', takeoffTime: '10:52:14', landingTime: '16:41:08', landingDetected: true, durationMinutes: 349,
  launchMethod: 'self-launch', launchMethodConfidence: 0.9, releaseHeightM: 438, maxAltitudeM: 2386,
  freeDistanceKm: 243.6, outAndReturnDistanceKm: 487.2, outlanding: true,
  departure: { icao: 'EDQD', name: 'Bayreuth', lat: 49.985, lon: 11.64 },
  arrival: { lat: 49.76213, lon: 11.54871 },
  gliderRegistration: 'D-KXYZ', gliderType: 'ASG 29E', pilot: 'Petra Lindner',
  ...over,
});

const created = (id: string, date = '2026-08-13') => ({
  data: { flight: { id, date }, fileId: `file-${id}`, summary: petraP2() },
  error: undefined,
});

const igcFile = (name = '2026-08-13-LXN-3GP-01.igc', size = 1000) =>
  new File(['x'.repeat(size)], name, { type: 'application/octet-stream' });

function FlightProbe() {
  const { flightId } = useParams();
  return <p data-testid="flight-page">{flightId}</p>;
}

function renderImport(props: { attachToFlightId?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/flights/import-igc']}>
        <Routes>
          <Route path="/flights/import-igc" element={<IgcImport {...props} />} />
          <Route path="/flights/:flightId" element={<FlightProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const input = () => document.querySelector('input[type="file"]') as HTMLInputElement;

const postsTo = (path: string) => postMock.mock.calls.filter(([p]) => p === path);
const formOf = (call: unknown[]) => (call[1] as { body: FormData }).body;

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  getMock.mockResolvedValue({ data: { flightFiles: { maxBytes: 5 * 1024 * 1024, maxPerFlight: 5 } }, error: undefined });
  putMock.mockImplementation(async (_p: string, { params }: { params: { path: { flightId: string } } }) => ({
    data: { id: params.path.flightId }, error: undefined,
  }));
});

describe('IgcImport — single file (P2)', () => {
  it('P2 shows the parsed self-launch out-and-return with outlanding and distances', async () => {
    postMock.mockResolvedValue({ data: petraP2(), error: undefined });
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());

    const summary = await screen.findByTestId('igc-summary');
    const s = within(summary);
    expect(s.getByText('Detected: Self-Launch (high confidence)')).toBeInTheDocument();
    expect(s.getByTestId('igc-outlanding')).toHaveTextContent('Outlanding');
    expect(s.getByText('243.6 km')).toBeInTheDocument();
    expect(s.getByText('487.2 km')).toBeInTheDocument();
    expect(s.getByText('438 m')).toBeInTheDocument();
    expect(s.getByText('2,386 m MSL')).toBeInTheDocument();
    expect(s.getByText('EDQD Bayreuth')).toBeInTheDocument();
    expect(s.getByText('49.76213N 11.54871E')).toBeInTheDocument();
    expect(s.getByText('D-KXYZ · ASG 29E')).toBeInTheDocument();
    expect(s.getByText('Petra Lindner')).toBeInTheDocument();
    expect(s.getByText('5h 49m')).toBeInTheDocument();
    expect(postsTo('/flights/igc/preview')).toHaveLength(1);
    expect(postsTo('/flights/igc')).toHaveLength(0);
  });

  it('names an undetected launch and a landing the file does not reach', async () => {
    postMock.mockResolvedValue({
      data: petraP2({ launchMethod: 'unknown', launchMethodConfidence: 0, releaseHeightM: undefined, landingDetected: false }),
      error: undefined,
    });
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());
    const s = within(await screen.findByTestId('igc-summary'));
    expect(s.getByText('Not detected')).toBeInTheDocument();
    expect(s.getByText(/last fix used/i)).toBeInTheDocument();
    expect(s.queryByText('Release height')).not.toBeInTheDocument();
  });

  it('P2 creates the flight without flightId and opens it, with no correction PUT', async () => {
    postMock.mockImplementation(async (path: string) =>
      path === '/flights/igc/preview' ? { data: petraP2(), error: undefined } : created('new-1'));
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());
    await user.click(await screen.findByRole('button', { name: 'Create flight' }));

    expect(await screen.findByTestId('flight-page')).toHaveTextContent('new-1');
    const [call] = postsTo('/flights/igc');
    expect(formOf(call).get('flightId')).toBeNull();
    expect(formOf(call).get('file')).toBeInstanceOf(File);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('offers attach vs create when the preview matches a flight; attaching sends flightId', async () => {
    postMock.mockImplementation(async (path: string) =>
      path === '/flights/igc/preview' ? { data: petraP2({ matchingFlightId: MATCH_ID }), error: undefined } : created(MATCH_ID));
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());

    const attach = await screen.findByRole('radio', { name: /attach to existing flight on 13\.08\.2026/i });
    expect(attach).toBeChecked();
    expect(screen.queryByLabelText('Launch method for the new flight')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Attach file' }));

    expect(await screen.findByTestId('flight-page')).toHaveTextContent(MATCH_ID);
    expect(formOf(postsTo('/flights/igc')[0]).get('flightId')).toBe(MATCH_ID);
    expect(putMock).not.toHaveBeenCalled();
  });

  it('choosing "Create a new flight" over a match sends no flightId', async () => {
    postMock.mockImplementation(async (path: string) =>
      path === '/flights/igc/preview' ? { data: petraP2({ matchingFlightId: MATCH_ID }), error: undefined } : created('new-2'));
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());
    await user.click(await screen.findByRole('radio', { name: /create a new flight/i }));
    await user.click(screen.getByRole('button', { name: 'Create flight' }));

    expect(await screen.findByTestId('flight-page')).toHaveTextContent('new-2');
    expect(formOf(postsTo('/flights/igc')[0]).get('flightId')).toBeNull();
  });

  it('a corrected launch method is written with PUT after the create and drops the detected release height', async () => {
    postMock.mockImplementation(async (path: string) =>
      path === '/flights/igc/preview'
        ? { data: petraP2({ launchMethod: 'aerotow', launchMethodConfidence: 0.7 }), error: undefined }
        : created('new-3'));
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());
    const select = await screen.findByLabelText('Launch method for the new flight');
    expect(select).toHaveValue('aerotow');
    await user.selectOptions(select, 'self-launch');
    await user.click(screen.getByRole('button', { name: 'Create flight' }));

    expect(await screen.findByTestId('flight-page')).toHaveTextContent('new-3');
    expect(putMock).toHaveBeenCalledWith('/flights/{flightId}', {
      params: { path: { flightId: 'new-3' } },
      body: { launchMethod: 'self-launch', releaseHeightM: null },
    });
  });

  it('attaching from a flight (attachToFlightId) shows no choice and sends that flight', async () => {
    postMock.mockImplementation(async (path: string) =>
      path === '/flights/igc/preview' ? { data: petraP2({ matchingFlightId: OTHER_ID }), error: undefined } : created(MATCH_ID));
    const user = userEvent.setup();
    renderImport({ attachToFlightId: MATCH_ID });
    await user.upload(input(), igcFile());
    await screen.findByTestId('igc-summary');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Attach file' }));
    await screen.findByTestId('flight-page');
    expect(formOf(postsTo('/flights/igc')[0]).get('flightId')).toBe(MATCH_ID);
  });

  it('a file without a registration cannot create a flight', async () => {
    postMock.mockResolvedValue({ data: petraP2({ gliderRegistration: undefined }), error: undefined });
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());
    expect(await screen.findByText(/names no glider registration/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create flight' })).toBeDisabled();
  });
});

describe('IgcImport — errors', () => {
  it('400 on preview shows the parser reason', async () => {
    postMock.mockResolvedValue({
      data: undefined,
      error: { error: 'not a valid IGC file: line 2: missing date record', httpStatus: 400 },
    });
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());
    expect(await screen.findByRole('alert')).toHaveTextContent('Not a valid IGC file: line 2: missing date record');
    expect(screen.getByRole('button', { name: 'Choose other files' })).toBeInTheDocument();
  });

  it('413 from the API says the file is too large', async () => {
    postMock.mockResolvedValue({ data: undefined, error: { error: 'The file exceeds the maximum size of 5 MB', httpStatus: 413 } });
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is larger than 5 MB.');
  });

  it('a file over the limit is refused before upload', async () => {
    getMock.mockResolvedValue({ data: { flightFiles: { maxBytes: 100, maxPerFlight: 5 } }, error: undefined });
    const user = userEvent.setup();
    renderImport();
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/up to 0 MB each/)).toBeInTheDocument());
    await user.upload(input(), igcFile('big.igc', 500));
    expect(await screen.findByRole('alert')).toHaveTextContent(/larger than/);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('409 duplicate names the flight holding the file with a link', async () => {
    postMock.mockImplementation(async (path: string) =>
      path === '/flights/igc/preview'
        ? { data: petraP2(), error: undefined }
        : { data: undefined, error: { error: `this IGC file is already stored on flight ${OTHER_ID}`, httpStatus: 409 } });
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), igcFile());
    await user.click(await screen.findByRole('button', { name: 'Create flight' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This IGC file is already stored with another flight.');
    expect(within(alert).getByRole('link', { name: 'Open the flight' })).toHaveAttribute('href', `/flights/${OTHER_ID}`);
    expect(screen.getByRole('button', { name: 'Create flight' })).toBeEnabled();
  });

  it('409 at the per-flight cap shows the API message without a link', async () => {
    postMock.mockImplementation(async (path: string) =>
      path === '/flights/igc/preview'
        ? { data: petraP2(), error: undefined }
        : { data: undefined, error: { error: 'This flight already has the maximum of 5 files', httpStatus: 409 } });
    const user = userEvent.setup();
    renderImport({ attachToFlightId: MATCH_ID });
    await user.upload(input(), igcFile());
    await user.click(await screen.findByRole('button', { name: 'Attach file' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This flight already has the maximum of 5 files');
    expect(within(alert).queryByRole('link')).not.toBeInTheDocument();
  });

  it('rejects a file that is not .igc', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderImport();
    await user.upload(input(), new File(['x'], 'flight.csv', { type: 'text/csv' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('flight.csv is not an IGC file.');
    expect(postMock).not.toHaveBeenCalled();
  });
});

describe('IgcImport — several files (P4 imports a season)', () => {
  it('processes files one after the other with a status per file', async () => {
    const order: string[] = [];
    const previews: Record<string, IgcFlightPreview> = {
      'a.igc': petraP2({ date: '2026-07-01' }),
      'b.igc': petraP2({ date: '2026-07-04', matchingFlightId: MATCH_ID }),
    };
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    postMock.mockImplementation(async (path: string, { body }: { body: FormData }) => {
      const name = (body.get('file') as File).name;
      order.push(`${path === '/flights/igc/preview' ? 'preview' : 'import'}:${name}`);
      if (path === '/flights/igc/preview') {
        if (name === 'c.igc') return { data: undefined, error: { error: 'not a valid IGC file: line 1: no A record', httpStatus: 400 } };
        if (name === 'a.igc') await gate;
        return { data: previews[name], error: undefined };
      }
      return name === 'a.igc' ? created('fa', '2026-07-01') : created(MATCH_ID, '2026-07-04');
    });
    const user = userEvent.setup();
    renderImport();
    await user.upload(input(), [igcFile('a.igc'), igcFile('b.igc'), igcFile('c.igc')]);

    const list = await screen.findByTestId('igc-batch');
    const rows = () => within(list).getAllByRole('listitem');
    expect(rows().map((r) => r.dataset.status)).toEqual(['analysing', 'pending', 'pending']);
    release();

    await waitFor(() => expect(rows().map((r) => r.dataset.status)).toEqual(['created', 'attached', 'failed']));
    expect(order).toEqual(['preview:a.igc', 'import:a.igc', 'preview:b.igc', 'import:b.igc', 'preview:c.igc']);
    expect(within(rows()[0]).getByRole('link', { name: /flight created/i })).toHaveAttribute('href', '/flights/fa');
    expect(within(rows()[1]).getByRole('link', { name: /attached to flight/i })).toHaveAttribute('href', `/flights/${MATCH_ID}`);
    expect(rows()[2]).toHaveTextContent('Not a valid IGC file: line 1: no A record');
    expect(screen.getByText('3 of 3 files processed')).toBeInTheDocument();

    const imports = postsTo('/flights/igc');
    expect(formOf(imports[0]).get('flightId')).toBeNull();
    expect(formOf(imports[1]).get('flightId')).toBe(MATCH_ID);
  });
});
