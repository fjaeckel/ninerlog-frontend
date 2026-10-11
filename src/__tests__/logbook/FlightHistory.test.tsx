import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlightHistoryCard, FlightHistoryList } from '../../components/logbook/FlightHistory';
import type { FlightRevision } from '../../hooks/useLogbook';

const modeState: { data: unknown } = { data: null };
const revisionsState: { data: FlightRevision[] | undefined; isError: boolean } = { data: [], isError: false };

vi.mock('../../hooks/useLogbook', () => ({
  useLogbookMode: () => modeState,
  useFlightRevisions: () => revisionsState,
}));

const revisions: FlightRevision[] = [
  {
    id: 'r3', flightId: 'f1', revisionNo: 3, kind: 'update', source: 'user_edit',
    reason: 'Tech log', isCorrection: true, changedAt: '2026-08-15T10:00:00Z',
    changes: [
      { field: 'totalTime', oldValue: 90, newValue: 95 },
      { field: 'someNewField', oldValue: 'a', newValue: 'b' },
    ],
  },
  {
    id: 'r2', flightId: 'f1', revisionNo: 2, kind: 'update', source: 'recalc',
    reason: null, isCorrection: false, changedAt: '2026-08-14T15:00:00Z',
    changes: [{ field: 'crossCountryTime', oldValue: 0, newValue: 90 }],
  },
  {
    id: 'r1', flightId: 'f1', revisionNo: 1, kind: 'update', source: 'user_edit',
    reason: null, isCorrection: false, changedAt: '2026-08-14T12:00:00Z',
    changes: [
      { field: 'crewMembers', oldValue: [{ name: 'Amelia', role: 'Student' }], newValue: [] },
    ],
  },
];

describe('FlightHistoryList', () => {
  it('shows each change struck through and inserted, with labels and badges', () => {
    render(<FlightHistoryList revisions={revisions} since="2026-07-17T10:00:00Z" />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    const first = items[0];
    expect(within(first).getByText('Correction')).toBeInTheDocument();
    expect(within(first).getByText('Edited')).toBeInTheDocument();
    expect(within(first).getByText('Reason: Tech log')).toBeInTheDocument();
    expect(within(first).getByText('Total Time')).toBeInTheDocument();
    expect(within(first).getByText('someNewField')).toBeInTheDocument();
    expect(within(first).getByText('1h 30m').tagName).toBe('DEL');
    expect(within(first).getByText('1h 35m').tagName).toBe('INS');

    expect(within(items[1]).getByText('Crew')).toBeInTheDocument();
    expect(within(items[1]).getByText('Amelia (Student)').tagName).toBe('DEL');

    expect(screen.getByText(/history is recorded since/i)).toBeInTheDocument();
  });

  it('collapses system changes behind a toggle', async () => {
    const user = userEvent.setup();
    render(<FlightHistoryList revisions={revisions} />);

    expect(screen.queryByText('Recalculated')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /show 1 system change/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByText('Recalculated')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /hide system changes/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('labels a delete', () => {
    render(
      <FlightHistoryList
        revisions={[{ ...revisions[0], id: 'd', kind: 'delete', isCorrection: false, changes: [], reason: 'Dup' }]}
      />
    );
    expect(screen.getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Reason: Dup')).toBeInTheDocument();
  });
});

describe('FlightHistoryCard', () => {
  beforeEach(() => {
    revisionsState.data = [];
    revisionsState.isError = false;
  });

  it('renders nothing in standard mode without revisions', () => {
    modeState.data = { strict: false, since: null };
    const { container } = render(<FlightHistoryCard flightId="f1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders in strict mode, even before any change', () => {
    modeState.data = { strict: true, since: '2026-07-17T10:00:00Z' };
    render(<FlightHistoryCard flightId="f1" />);
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText(/no changes recorded yet/i)).toBeInTheDocument();
  });

  it('keeps showing recorded history after strict mode is switched off', () => {
    modeState.data = { strict: false, since: null };
    revisionsState.data = [revisions[0]];
    render(<FlightHistoryCard flightId="f1" />);
    expect(screen.getByText('Correction')).toBeInTheDocument();
  });
});
