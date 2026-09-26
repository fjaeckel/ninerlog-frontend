import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomReportsSection } from '../../components/reports/CustomReportsSection';
import * as hooks from '../../hooks/useCustomReports';
import * as useLicensesHook from '../../hooks/useLicenses';
import type { CustomReport, CustomReportResult } from '../../lib/customReports';

vi.mock('recharts', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-chart">{children}</div>;
  const Null = () => null;
  return {
    ResponsiveContainer: Stub,
    AreaChart: Stub,
    BarChart: Stub,
    Area: Null,
    Bar: Null,
    Cell: Null,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    Tooltip: Null,
    Legend: Null,
  };
});

const row = (key: string, value: number, flights = 1) => ({
  key, label: key || '', value, flights, totalTime: value, picTime: value, dualTime: 0, dualGivenTime: 0,
  nightTime: value, ifrTime: 0, crossCountryTime: 0, fstdTime: 0, landings: flights,
  launches: 0, outlandings: 0, towFlights: 0,
});

const reports: CustomReport[] = [
  {
    id: 'a', name: 'Hours per month', position: 0, createdAt: '', updatedAt: '',
    definition: { filter: {}, window: { kind: 'lastMonths', months: 12 }, groupBy: 'month', metric: 'totalTime' },
  },
  {
    id: 'b', name: 'Night by aircraft', position: 1, createdAt: '', updatedAt: '',
    definition: {
      filter: { q: 'night>0', role: 'pic', departureIcao: 'EDDF' },
      window: { kind: 'all' }, groupBy: 'registration', metric: 'nightTime', limit: 2,
    },
  },
];

const results: Record<string, CustomReportResult> = {
  a: {
    groupBy: 'month', metric: 'totalTime', startDate: '2025-09-01', endDate: '2026-08-31',
    rows: [row('2026-07', 60), row('2026-08', 90, 2)],
    totals: { ...row('', 150, 3) }, otherGroups: 0, generatedAt: '',
  },
  b: {
    groupBy: 'registration', metric: 'nightTime',
    rows: [row('D-EABC', 540, 9), row('', 75, 2)],
    totals: { ...row('', 700, 12) }, otherGroups: 3, generatedAt: '',
  },
};

const reorder = vi.fn();
const remove = vi.fn();
const exportMutate = vi.fn();

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.search}`}</div>;
}

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/reports']}>
        <Where />
        <Routes>
          <Route path="*" element={<CustomReportsSection />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function mockList(data: CustomReport[]) {
  vi.spyOn(hooks, 'useCustomReports').mockReturnValue({ data, isLoading: false, error: null } as never);
}

describe('CustomReportsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    reorder.mockReset();
    remove.mockReset();
    exportMutate.mockReset();
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
    vi.spyOn(hooks, 'useCustomReportResult').mockImplementation(
      (id) => ({ data: results[id], isLoading: false, error: null }) as never
    );
    vi.spyOn(hooks, 'useReorderCustomReports').mockReturnValue({ mutate: reorder, error: null } as never);
    vi.spyOn(hooks, 'useDeleteCustomReport').mockReturnValue({
      mutateAsync: remove, isPending: false, error: null,
    } as never);
    vi.spyOn(hooks, 'useExportCustomReport').mockReturnValue({
      mutate: exportMutate, isPending: false, error: null,
    } as never);
    vi.spyOn(hooks, 'useCustomReportPreview').mockReturnValue({ data: undefined, error: null, isFetching: false } as never);
    vi.spyOn(hooks, 'useCreateCustomReport').mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null } as never);
    vi.spyOn(hooks, 'useUpdateCustomReport').mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null } as never);
  });

  it('explains how to create a report when there are none', async () => {
    const user = userEvent.setup();
    mockList([]);
    renderSection();
    expect(screen.getByText('No custom reports yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to flights' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/flights');
  });

  it('renders each report with its summary, ranked rows and the cut-off note', () => {
    mockList(reports);
    renderSection();
    expect(screen.getByText('Hours per month')).toBeInTheDocument();
    expect(screen.getByText('Total time by month · Last 12 months')).toBeInTheDocument();
    expect(
      screen.getByText('Night time by registration · All time · From EDDF · PIC only · “night>0”')
    ).toBeInTheDocument();
    expect(screen.getByText('D-EABC')).toBeInTheDocument();
    expect(screen.getByText('(none)')).toBeInTheDocument();
    expect(screen.getByText('3 more groups not shown (included in totals)')).toBeInTheDocument();
  });

  it('shows every metric and a totals row in the table view', async () => {
    const user = userEvent.setup();
    mockList(reports);
    renderSection();
    const card = screen.getByText('Hours per month').closest('section') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: 'Show as table' }));
    const table = within(card).getByRole('table');
    for (const header of ['Month', 'Flights', 'Total', 'PIC', 'Night', 'FSTD', 'Ldg']) {
      expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    expect(within(table).getByText('Aug 2026')).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    const totalsRow = rows[rows.length - 1];
    expect(within(totalsRow).getByText('Total')).toBeInTheDocument();
    expect(within(totalsRow).getAllByText('2h 30m').length).toBeGreaterThan(0);
  });

  it('moves a report with the full id list', async () => {
    const user = userEvent.setup();
    mockList(reports);
    renderSection();
    await user.click(screen.getByRole('button', { name: 'Actions for Night by aircraft' }));
    expect(screen.getByRole('menuitem', { name: 'Move down' })).toBeDisabled();
    await user.click(screen.getByRole('menuitem', { name: 'Move up' }));
    expect(reorder).toHaveBeenCalledWith(['b', 'a']);
  });

  it('exports and opens the flights behind a report', async () => {
    const user = userEvent.setup();
    mockList(reports);
    renderSection();
    await user.click(screen.getByRole('button', { name: 'Actions for Hours per month' }));
    await user.click(screen.getByRole('menuitem', { name: 'Export PDF' }));
    expect(exportMutate).toHaveBeenCalledWith({ id: 'a', name: 'Hours per month', format: 'pdf' });

    await user.click(screen.getByRole('button', { name: 'Actions for Night by aircraft' }));
    await user.click(screen.getByRole('menuitem', { name: 'Show flights' }));
    expect(screen.getByTestId('where')).toHaveTextContent(
      '/flights?q=night%3E0&departureIcao=EDDF&function=pic'
    );
  });

  it('opens the flights of a windowed report bounded by the resolved dates', async () => {
    const user = userEvent.setup();
    mockList(reports);
    renderSection();
    await user.click(screen.getByRole('button', { name: 'Actions for Hours per month' }));
    await user.click(screen.getByRole('menuitem', { name: 'Show flights' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/flights?startDate=2025-09-01&endDate=2026-08-31');
  });

  it('deletes after confirmation', async () => {
    const user = userEvent.setup();
    remove.mockResolvedValue(undefined);
    mockList(reports);
    renderSection();
    await user.click(screen.getByRole('button', { name: 'Actions for Hours per month' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByText('Delete report?')).toBeInTheDocument();
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledWith('a');
  });

  it('opens the edit dialog from the menu', async () => {
    const user = userEvent.setup();
    mockList(reports);
    renderSection();
    await user.click(screen.getByRole('button', { name: 'Actions for Night by aircraft' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: 'Edit report' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Night by aircraft');
  });
});
