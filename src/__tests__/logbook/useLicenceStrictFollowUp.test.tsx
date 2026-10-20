import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLicenceStrictFollowUp } from '../../components/logbook/useLicenceStrictFollowUp';
import { STRICT_OFFER_KEY } from '../../lib/logbookPrompts';
import type { License } from '../../types/api';

const state: { before: unknown; after: unknown } = { before: null, after: null };
const updateMode = vi.fn();

vi.mock('../../hooks/useLogbook', () => ({
  useLogbookMode: () => ({ data: state.before, refetch: () => Promise.resolve({ data: state.after }) }),
  useUpdateLogbookMode: () => ({ mutateAsync: updateMode, isPending: false }),
}));

const licence: License = {
  id: 'l9', userId: 'u', regulatoryAuthority: 'EASA', licenseType: 'LAPL(A)', licenseNumber: 'n',
  issueDate: '2020-01-01', issuingAuthority: 'BAZL', requiresSeparateLogbook: false, issuingCountry: 'CH',
  createdAt: '', updatedAt: '',
};

type Event = { strict: boolean; trigger: 'licence' | 'manual' | 'import'; licenseId?: string | null; createdAt: string };

const mode = (strict: boolean, suggested: string[] = [], events: Event[] = []) => ({
  strict, requiredBy: [], suggestedBy: suggested.map((licenseId) => ({ licenseId })), events,
});

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const licenceOn = (createdAt: string, licenseId = 'l9'): Event => ({ strict: true, trigger: 'licence', licenseId, createdAt });

function Harness() {
  const { onLicenceSaved, dialogs } = useLicenceStrictFollowUp();
  return (
    <>
      <button type="button" onClick={() => onLicenceSaved(licence)}>
        saved
      </button>
      {dialogs}
    </>
  );
}

const trigger = () => fireEvent.click(screen.getByRole('button', { name: 'saved' }));

describe('useLicenceStrictFollowUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(STRICT_OFFER_KEY);
  });

  it('shows the strict-mode notice when the save switched strict mode on', async () => {
    state.before = mode(false);
    state.after = mode(true, [], [licenceOn(ago(0))]);
    render(<Harness />);
    await act(async () => trigger());
    const notice = screen.getByRole('dialog', { name: /strict logbook mode is on/i });
    expect(notice).toHaveTextContent(/your licence easa lapl\(a\) \(switzerland\) requires/i);
    expect(notice).toHaveTextContent(/never recorded with history/i);
  });

  it('offers strict mode once for a licence that only suggests it', async () => {
    state.before = mode(false);
    state.after = mode(false, ['l9']);
    updateMode.mockResolvedValue(mode(true));
    render(<Harness />);
    await act(async () => trigger());
    expect(screen.getByRole('dialog', { name: /keep a change history/i })).toBeInTheDocument();
    expect(updateMode).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /switch strict mode on/i }));
    expect(updateMode).toHaveBeenCalledWith(true);
    expect(await screen.findByRole('dialog', { name: /strict logbook mode is on/i })).toBeInTheDocument();
  });

  it('does not offer again for the same licence', async () => {
    state.before = mode(false);
    state.after = mode(false, ['l9']);
    render(<Harness />);
    await act(async () => trigger());
    await userEvent.click(screen.getByRole('button', { name: /not now/i }));
    await act(async () => trigger());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the notice when the earlier mode query had not loaded', async () => {
    state.before = undefined;
    state.after = mode(true, [], [licenceOn(ago(2_000))]);
    render(<Harness />);
    await act(async () => trigger());
    expect(screen.getByRole('dialog', { name: /strict logbook mode is on/i })).toBeInTheDocument();
  });

  it('stays quiet when already strict and the mode query had not loaded', async () => {
    state.before = undefined;
    state.after = mode(true, [], [
      { strict: true, trigger: 'manual', createdAt: ago(86_400_000) },
      licenceOn(ago(3_600_000)),
    ]);
    render(<Harness />);
    await act(async () => trigger());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays quiet when the switch-on came from another licence', async () => {
    state.before = mode(false);
    state.after = mode(true, [], [licenceOn(ago(0), 'other')]);
    render(<Harness />);
    await act(async () => trigger());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays quiet when the event was already known before the save', async () => {
    const event = licenceOn(ago(1_000));
    state.before = mode(true, [], [event]);
    state.after = mode(true, [], [event]);
    render(<Harness />);
    await act(async () => trigger());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays quiet when nothing changed', async () => {
    state.before = mode(true);
    state.after = mode(true);
    render(<Harness />);
    await act(async () => trigger());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
