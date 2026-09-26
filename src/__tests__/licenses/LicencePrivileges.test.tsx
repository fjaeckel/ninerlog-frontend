import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LicenseCard from '../../components/licenses/LicenseCard';
import type { License } from '../../stores/licenseStore';
import type { LicencePrivilege } from '../../lib/privileges';
import { validatePrivilegeDraft, privilegeCreateBody, privilegeUpdateBody, emptyPrivilegeDraft } from '../../lib/privileges';
import { profileWith } from '../../test/pilotProfile';
import { resolveDisciplines, useDisciplines, type Discipline, type DisciplineStatus } from '../../hooks/usePilotProfile';

const mockDisciplines = (statuses: Partial<Record<Discipline, DisciplineStatus>>) =>
  vi.mocked(useDisciplines).mockReturnValue(resolveDisciplines(profileWith(statuses), false));

const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
let privileges: LicencePrivilege[] = [];

vi.mock('../../hooks/useLicencePrivileges', () => ({
  useLicencePrivileges: () => ({ data: privileges, isLoading: false, isError: false }),
  useCreateLicencePrivilege: () => ({ mutateAsync: create, isPending: false }),
  useUpdateLicencePrivilege: () => ({ mutateAsync: update, isPending: false }),
  useDeleteLicencePrivilege: () => ({ mutateAsync: remove, isPending: false }),
}));

vi.mock('../../hooks/useClassRatings', () => ({
  useClassRatings: () => ({ data: [], isLoading: false }),
  useCreateClassRating: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClassRating: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteClassRating: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../hooks/usePilotProfile', async (orig) => {
  const actual = await orig<typeof import('../../hooks/usePilotProfile')>();
  return { ...actual, useDisciplines: vi.fn() };
});

const license: License = {
  id: 'l1', userId: 'u1', regulatoryAuthority: 'EASA', licenseType: 'SPL', licenseNumber: 'DE.SFCL.10234',
  issueDate: '2021-05-15', issuingAuthority: 'LBA', requiresSeparateLogbook: false,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
};

const priv = (over: Partial<LicencePrivilege>): LicencePrivilege => ({
  id: 'pv1', licenseId: 'l1', kind: 'SAILPLANE_TOWING', createdAt: '', updatedAt: '', ...over,
});

const renderCard = (addPrivilegeKind?: LicencePrivilege['kind']) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LicenseCard license={license} onEdit={vi.fn()} onDelete={vi.fn()} addPrivilegeKind={addPrivilegeKind} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('licence privileges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({});
    update.mockResolvedValue({});
    remove.mockResolvedValue(undefined);
    privileges = [];
    mockDisciplines({ SAILPLANE: 'active' });
  });

  it('lists privileges with kind label, detail, dates and notes', () => {
    privileges = [
      priv({ id: 'pv1', kind: 'LAUNCH_METHOD_TRAINED', detail: 'winch', issuedOn: '2020-08-22' }),
      priv({ id: 'pv2', kind: 'UL_TOWING', detail: 'WEIGHT_SHIFT', expiresOn: '2020-01-01', notes: 'DULV' }),
    ];
    renderCard();
    const row1 = screen.getByTestId('privilege-pv1');
    expect(within(row1).getByText('Launch method trained')).toBeInTheDocument();
    expect(within(row1).getByText('Winch')).toBeInTheDocument();
    expect(within(row1).getByText('22.08.2020')).toBeInTheDocument();
    const row2 = screen.getByTestId('privilege-pv2');
    expect(within(row2).getByText('UL towing')).toBeInTheDocument();
    expect(within(row2).getByText('Weight-shift trike')).toBeInTheDocument();
    expect(within(row2).getByText('DULV')).toBeInTheDocument();
    expect(within(row2).getByText('Expired')).toBeInTheDocument();
  });

  it('L4: adding a trained launch method needs a method from the list', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: /add privilege/i }));
    await user.selectOptions(screen.getByLabelText('Privilege'), 'LAUNCH_METHOD_TRAINED');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('privilege-form-error')).toHaveTextContent('This privilege needs a detail.');
    expect(create).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('Launch method'), 'aerotow');
    await user.type(screen.getByLabelText('Issue date (optional)'), '2021-04-10');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(create).toHaveBeenCalledWith({ licenseId: 'l1', data: { kind: 'LAUNCH_METHOD_TRAINED', detail: 'aerotow', issuedOn: '2021-04-10' } });
  });

  it('UL towing takes an ultralight kind; a type briefing takes the aircraft type', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: /add privilege/i }));
    await user.selectOptions(screen.getByLabelText('Privilege'), 'UL_TOWING');
    await user.selectOptions(screen.getByLabelText('Ultralight kind'), 'THREE_AXIS');
    await user.selectOptions(screen.getByLabelText('Privilege'), 'UL_TYPE_BRIEFING');
    const type = screen.getByLabelText('Type briefing on aircraft type');
    expect(type).toHaveValue('');
    await user.type(type, 'C42 B');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(create).toHaveBeenCalledWith({ licenseId: 'l1', data: { kind: 'UL_TYPE_BRIEFING', detail: 'C42 B' } });
  });

  it('rejects an expiry date before the issue date', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: /add privilege/i }));
    await user.selectOptions(screen.getByLabelText('Privilege'), 'CLOUD_FLYING');
    await user.type(screen.getByLabelText('Issue date (optional)'), '2024-05-01');
    await user.type(screen.getByLabelText('Expiry date (optional)'), '2024-04-30');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('privilege-form-error')).toHaveTextContent('cannot be before the issue date');
    expect(create).not.toHaveBeenCalled();
  });

  it('edits a privilege and clears an emptied field with null', async () => {
    privileges = [priv({ id: 'pv1', kind: 'CLOUD_FLYING', issuedOn: '2014-05-30', notes: 'old' })];
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: 'Edit privilege' }));
    await user.clear(screen.getByLabelText('Notes (optional)'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(update).toHaveBeenCalledWith({
      licenseId: 'l1', privilegeId: 'pv1',
      data: { kind: 'CLOUD_FLYING', detail: null, issuedOn: '2014-05-30', expiresOn: null, notes: null },
    });
  });

  it('deletes a privilege', async () => {
    privileges = [priv({ id: 'pv1' })];
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: 'Remove privilege' }));
    expect(remove).toHaveBeenCalledWith({ licenseId: 'l1', privilegeId: 'pv1' });
  });

  it('P job 3: the kind picker lists sailplane kinds first and the rest under "More privileges"', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: /add privilege/i }));
    const more = screen.getByTestId('more-privilege-kinds');
    expect(within(more).getByRole('option', { name: 'Passenger authorisation (UL)' })).toBeInTheDocument();
    expect(within(more).getByRole('option', { name: 'FI(S)' })).toBeInTheDocument();
    expect(within(more).queryByRole('option', { name: 'Sailplane towing' })).toBeNull();
    expect(screen.getByLabelText('Privilege')).toHaveValue('SAILPLANE_TOWING');
  });

  it('M job 1: an ultralight pilot sees UL kinds first; addPrivilegeKind opens the form preselected', async () => {
    mockDisciplines({ ULTRALIGHT: 'active' });
    renderCard('UL_PASSENGER_AUTH');
    expect(screen.getByLabelText('Privilege')).toHaveValue('UL_PASSENGER_AUTH');
    const more = screen.getByTestId('more-privilege-kinds');
    expect(within(more).getByRole('option', { name: 'Cloud flying' })).toBeInTheDocument();
    expect(within(more).queryByRole('option', { name: 'UL towing' })).toBeNull();
  });

  it('A1: an airline pilot with no privileges finds the section folded, one tap away', async () => {
    mockDisciplines({ AEROPLANE: 'active', MULTI_CREW: 'active', IFR: 'active' });
    const user = userEvent.setup();
    renderCard();
    expect(screen.queryByText('Privileges')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Privileges and endorsements' }));
    expect(screen.getByText('Privileges')).toBeInTheDocument();
  });

  it('data always wins: a recorded privilege shows unfolded for any pilot', async () => {
    mockDisciplines({ AEROPLANE: 'active' });
    privileges = [priv({ id: 'pv1', kind: 'BANNER_TOWING' })];
    renderCard();
    expect(screen.getByText('Banner towing')).toBeInTheDocument();
  });
});

describe('validatePrivilegeDraft', () => {
  const d = (over: Partial<ReturnType<typeof emptyPrivilegeDraft>>) => ({ ...emptyPrivilegeDraft('LAUNCH_METHOD_TRAINED'), ...over });
  it.each([
    [d({}), 'detailRequired'],
    [d({ detail: 'catapult' }), 'detailInvalid'],
    [d({ detail: 'Winch' }), null],
    [d({ kind: 'UL_TOWING', detail: 'THREE_AXIS_MOTORGLIDER' }), 'detailInvalid'],
    [d({ kind: 'UL_TOWING', detail: 'weight_shift' }), null],
    [d({ kind: 'UL_TYPE_BRIEFING', detail: '  ' }), 'detailRequired'],
    [d({ kind: 'UL_TYPE_BRIEFING', detail: 'x'.repeat(101) }), 'detailTooLong'],
    [d({ kind: 'CLOUD_FLYING' }), null],
    [d({ kind: 'CLOUD_FLYING', issuedOn: '2024-05-01', expiresOn: '2024-05-01' }), null],
    [d({ kind: 'CLOUD_FLYING', notes: 'n'.repeat(1001) }), 'notesTooLong'],
  ] as const)('%o → %s', (draft, expected) => {
    expect(validatePrivilegeDraft(draft)).toBe(expected);
  });

  it('normalises detail the way the API stores it', () => {
    expect(privilegeCreateBody(d({ detail: ' Winch ' })).detail).toBe('winch');
    expect(privilegeUpdateBody(d({ kind: 'UL_TOWING', detail: 'three_axis' })).detail).toBe('THREE_AXIS');
  });
});
