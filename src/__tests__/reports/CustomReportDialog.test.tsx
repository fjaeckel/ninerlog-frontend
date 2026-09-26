import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomReportDialog } from '../../components/reports/CustomReportDialog';
import * as hooks from '../../hooks/useCustomReports';
import * as useLicensesHook from '../../hooks/useLicenses';
import type { CustomReport, CustomReportDefinition, CustomReportResult } from '../../lib/customReports';

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

const row = (key: string, value: number) => ({
  key, label: key, value, flights: 2, totalTime: value, picTime: 0, dualTime: 0, dualGivenTime: 0,
  nightTime: 0, ifrTime: 0, crossCountryTime: 0, fstdTime: 0, landings: 3, launches: 0, outlandings: 0, towFlights: 0,
});
const RESULT: CustomReportResult = {
  groupBy: 'month',
  metric: 'totalTime',
  rows: [row('2026-01', 90), row('2026-02', 30)],
  totals: { ...row('', 120), flights: 4, landings: 6 },
  otherGroups: 0,
  generatedAt: '2026-02-28T00:00:00Z',
};

const INITIAL: CustomReportDefinition = {
  filter: { q: 'night>0', aircraftReg: 'D-EABC', role: 'pic' },
  window: { kind: 'range', startDate: '2026-01-01', endDate: '2026-02-28' },
  groupBy: 'month',
  metric: 'totalTime',
};

const createMutate = vi.fn();
const updateMutate = vi.fn();
let previewArgs: { definition: CustomReportDefinition; enabled: boolean }[] = [];
let previewError: Error | null = null;

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.hash}`}</div>;
}

function renderDialog(props: Partial<React.ComponentProps<typeof CustomReportDialog>> = {}) {
  const onClose = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/flights']}>
        <Where />
        <Routes>
          <Route path="*" element={<CustomReportDialog open onClose={onClose} {...props} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { onClose };
}

describe('CustomReportDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createMutate.mockReset();
    updateMutate.mockReset();
    previewArgs = [];
    previewError = null;
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
    vi.spyOn(hooks, 'useCustomReportPreview').mockImplementation((definition, enabled) => {
      previewArgs.push({ definition, enabled });
      return { data: previewError ? undefined : RESULT, error: previewError, isFetching: false } as never;
    });
    vi.spyOn(hooks, 'useCreateCustomReport').mockReturnValue({
      mutateAsync: createMutate,
      isPending: false,
      error: null,
    } as never);
    vi.spyOn(hooks, 'useUpdateCustomReport').mockReturnValue({
      mutateAsync: updateMutate,
      isPending: false,
      error: null,
    } as never);
  });

  it('pre-fills the filter and window and previews the definition', () => {
    renderDialog({ initialDefinition: INITIAL });
    expect(screen.getByRole('heading', { name: 'Save as report' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search query')).toHaveValue('night>0');
    expect(screen.getByLabelText('Time window')).toHaveValue('range');
    expect(screen.getByLabelText('From')).toHaveValue('2026-01-01');
    const chips = within(screen.getByRole('list', { name: 'Active filters' }));
    expect(chips.getByText('Reg D-EABC')).toBeInTheDocument();
    expect(chips.getByText('PIC only')).toBeInTheDocument();
    expect(screen.getByText(/4 flights · Total time: 2h 0m/)).toBeInTheDocument();
    expect(previewArgs[previewArgs.length - 1]).toEqual({ definition: INITIAL, enabled: true });
  });

  it('removes a structured filter chip from the definition', async () => {
    const user = userEvent.setup();
    renderDialog({ initialDefinition: INITIAL });
    await user.click(screen.getByRole('button', { name: 'Remove filter: Reg D-EABC' }));
    expect(screen.queryByText('Reg D-EABC')).toBeNull();
    expect(previewArgs[previewArgs.length - 1]?.definition.filter).toEqual({ q: 'night>0', role: 'pic' });
  });

  it('shows the limit only for ranked groupings', async () => {
    const user = userEvent.setup();
    renderDialog({ initialDefinition: INITIAL });
    expect(screen.queryByLabelText('Max. groups')).toBeNull();
    await user.selectOptions(screen.getByLabelText('Group by'), 'registration');
    expect(screen.getByLabelText('Max. groups')).toBeInTheDocument();
  });

  it('shows the API error of an invalid definition', () => {
    previewError = new Error('invalid q: unexpected ")"');
    renderDialog({ initialDefinition: INITIAL });
    expect(screen.getByRole('alert')).toHaveTextContent('invalid q: unexpected ")"');
  });

  it('requires a name, saves the definition and offers the Reports page', async () => {
    const user = userEvent.setup();
    createMutate.mockResolvedValue({ id: 'r1', name: 'Night hours' });
    const { onClose } = renderDialog({ initialDefinition: INITIAL });

    const save = screen.getByRole('button', { name: 'Save report' });
    expect(save).toBeDisabled();
    // Modal moves focus once after opening.
    await new Promise((r) => setTimeout(r, 80));
    await user.type(screen.getByLabelText('Name'), 'Night hours');
    await user.click(save);

    expect(createMutate).toHaveBeenCalledWith({ name: 'Night hours', definition: INITIAL });
    expect(await screen.findByText('Report saved')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View in Reports' }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/reports#custom');
  });

  it('updates an existing report and closes', async () => {
    const user = userEvent.setup();
    updateMutate.mockResolvedValue({});
    const report: CustomReport = {
      id: 'r9', name: 'Old', definition: { ...INITIAL, window: { kind: 'lastMonths', months: 6 } },
      position: 0, createdAt: '', updatedAt: '',
    };
    const { onClose } = renderDialog({ report });
    expect(screen.getByRole('heading', { name: 'Edit report' })).toBeInTheDocument();
    expect(screen.getByLabelText('Months')).toHaveValue(6);
    await new Promise((r) => setTimeout(r, 80));

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'New');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateMutate).toHaveBeenCalledWith({
      id: 'r9',
      input: { name: 'New', definition: { ...report.definition, window: { kind: 'lastMonths', months: 6 } } },
    });
  });
});
