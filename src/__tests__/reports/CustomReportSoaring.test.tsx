import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../../i18n';
import { CustomReportDialog } from '../../components/reports/CustomReportDialog';
import { useCustomReportColumns, useCustomReportFormat } from '../../components/reports/customReportFormat';
import * as hooks from '../../hooks/useCustomReports';
import * as useLicensesHook from '../../hooks/useLicenses';
import { PERSONA_PROFILES } from '../../test/pilotProfile';
import type { PilotProfile } from '../../hooks/usePilotProfile';
import type { CustomReportResult, CustomReportRow } from '../../lib/customReports';

vi.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Null = () => null;
  return {
    ResponsiveContainer: Stub, AreaChart: Stub, BarChart: Stub, Area: Null, Bar: Null, Cell: Null,
    XAxis: Null, YAxis: Null, CartesianGrid: Null, Tooltip: Null, Legend: Null,
  };
});

const profileState = vi.hoisted(() => ({ profile: undefined as unknown }));
vi.mock('../../hooks/usePilotProfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/usePilotProfile')>();
  return {
    ...actual,
    useDisciplines: () => actual.resolveDisciplines(profileState.profile as PilotProfile | undefined, false),
  };
});

const zero = {
  flights: 0, totalTime: 0, picTime: 0, dualTime: 0, dualGivenTime: 0, nightTime: 0, ifrTime: 0,
  crossCountryTime: 0, fstdTime: 0, landings: 0, launches: 0, outlandings: 0, towFlights: 0,
};
const row = (key: string, launches: number): CustomReportRow => ({ ...zero, key, label: key, value: launches, flights: launches, launches });

const renderWith = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  profileState.profile = PERSONA_PROFILES.lena();
  vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
  vi.spyOn(hooks, 'useCustomReportPreview').mockReturnValue({ data: undefined, error: null, isFetching: false } as never);
  vi.spyOn(hooks, 'useCreateCustomReport').mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null } as never);
  vi.spyOn(hooks, 'useUpdateCustomReport').mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null } as never);
});

const metricSelect = () => screen.getByLabelText('Metric');
const groupSelect = () => screen.getByLabelText('Group by');

describe('Custom reports — soaring metrics and groupings', () => {
  it('L Lena: launches, outlandings and tow flights are offered with the other metrics', () => {
    renderWith(<CustomReportDialog open onClose={vi.fn()} />);
    for (const name of ['Launches', 'Outlandings', 'Tow flights']) {
      expect(within(metricSelect()).getByRole('option', { name })).toBeInTheDocument();
    }
    expect(within(metricSelect()).queryByTestId('more-metrics')).not.toBeInTheDocument();
  });

  it('A1 Mark: launches and outlandings fold under "More metrics"; tow flights stays (AEROPLANE)', () => {
    profileState.profile = PERSONA_PROFILES.mark();
    renderWith(<CustomReportDialog open onClose={vi.fn()} />);
    const more = within(screen.getByTestId('more-metrics'));
    expect(more.getByRole('option', { name: 'Launches' })).toBeInTheDocument();
    expect(more.getByRole('option', { name: 'Outlandings' })).toBeInTheDocument();
    expect(more.queryByRole('option', { name: 'Tow flights' })).not.toBeInTheDocument();
    expect(within(metricSelect()).getByRole('option', { name: 'Tow flights' })).toBeInTheDocument();
  });

  it('M Mehmet: a saved launches report keeps its metric in the relevant group', () => {
    profileState.profile = PERSONA_PROFILES.mehmet();
    renderWith(
      <CustomReportDialog
        open
        onClose={vi.fn()}
        initialDefinition={{ filter: {}, window: { kind: 'all' }, groupBy: 'launchMethod', metric: 'launches' }}
      />,
    );
    expect(metricSelect()).toHaveValue('launches');
    expect(within(screen.getByTestId('more-metrics')).queryByRole('option', { name: 'Launches' })).not.toBeInTheDocument();
  });

  it('offers the launch method, aircraft class and UL kind groupings', () => {
    renderWith(<CustomReportDialog open onClose={vi.fn()} />);
    for (const name of ['Launch method', 'Aircraft class', 'Ultralight kind']) {
      expect(within(groupSelect()).getByRole('option', { name })).toBeInTheDocument();
    }
  });

  it('German labels for the new metrics and groupings', () => {
    const de = i18n.getFixedT('de', 'reports');
    expect(de('custom.metric.launches')).toBe('Starts');
    expect(de('custom.metric.outlandings')).toBe('Außenlandungen');
    expect(de('custom.metric.towFlights')).toBe('Schleppflüge');
    expect(de('custom.groupBy.launchMethod')).toBe('Startart');
    expect(de('custom.groupBy.aircraftClass')).toBe('Luftfahrzeugklasse');
    expect(de('custom.groupBy.ulKind')).toBe('UL-Art');
  });
});

function Table({ result }: { result: CustomReportResult }) {
  const columns = useCustomReportColumns(result);
  const { rowLabel } = useCustomReportFormat();
  return (
    <div>
      <p data-testid="headers">{columns.map((c) => c.header).join('|')}</p>
      <ul>{result.rows.map((r) => <li key={r.key}>{rowLabel(result, r)}</li>)}</ul>
    </div>
  );
}

describe('Custom report results — soaring columns and group labels', () => {
  it('L Lena: launch-method keys read as launch methods; the launches column shows when charted', () => {
    const result: CustomReportResult = {
      groupBy: 'launchMethod', metric: 'launches', rows: [row('winch', 40), row('self-launch', 3), row('', 2)],
      totals: { ...zero, launches: 45 }, otherGroups: 0, generatedAt: '',
    };
    renderWith(<Table result={result} />);
    expect(screen.getByText('Winch')).toBeInTheDocument();
    expect(screen.getByText('Self-Launch')).toBeInTheDocument();
    expect(screen.getByText('(none)')).toBeInTheDocument();
    expect(screen.getByTestId('headers')).toHaveTextContent('Launches');
    expect(screen.getByTestId('headers')).not.toHaveTextContent('Tows');
  });

  it('S Sabine: UL kind and class keys are localised', () => {
    const result: CustomReportResult = {
      groupBy: 'ulKind', metric: 'flights', rows: [row('POWERED_PARAGLIDER', 0)],
      totals: zero, otherGroups: 0, generatedAt: '',
    };
    renderWith(<Table result={result} />);
    expect(screen.getByText('Powered paraglider')).toBeInTheDocument();
  });

  it('A1 Mark: a report without soaring figures has no soaring columns', () => {
    const result: CustomReportResult = {
      groupBy: 'month', metric: 'totalTime', rows: [], totals: zero, otherGroups: 0, generatedAt: '',
    };
    renderWith(<Table result={result} />);
    const headers = screen.getByTestId('headers').textContent ?? '';
    expect(headers).not.toMatch(/Launches|Outl\.|Tows/);
  });
});
