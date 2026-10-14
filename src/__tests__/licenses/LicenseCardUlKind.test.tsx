import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LicenseCard from '../../components/licenses/LicenseCard';
import type { License } from '../../stores/licenseStore';

const ratings = [
  { id: 'cr-3ax', licenseId: 'l-ul', classType: 'ULTRALIGHT', ulKind: 'THREE_AXIS', issueDate: '2018-07-21', expiryDate: null },
  { id: 'cr-none', licenseId: 'l-ul', classType: 'ULTRALIGHT', ulKind: null, issueDate: '2024-05-04', expiryDate: null },
];

vi.mock('../../hooks/useClassRatings', () => ({
  useClassRatings: () => ({ data: ratings, isLoading: false }),
  useCreateClassRating: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClassRating: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteClassRating: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const license: License = {
  id: 'l-ul',
  userId: 'u1',
  regulatoryAuthority: 'DULV',
  licenseType: 'UL',
  licenseNumber: 'UL-77410',
  issueDate: '2018-07-21',
  issuingAuthority: 'DULV',
  requiresSeparateLogbook: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const renderCard = (editRatingId?: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LicenseCard license={license} onEdit={vi.fn()} onDelete={vi.fn()} editRatingId={editRatingId} />
    </QueryClientProvider>
  );

describe('LicenseCard — ultralight kind', () => {
  it('S1: a rating with no kind reads "Kind not set", not three-axis', () => {
    renderCard();
    expect(screen.getByText('Kind not set')).toBeInTheDocument();
    expect(screen.getAllByText('Three-axis ultralight')).toHaveLength(1);
  });

  it('S1: editRatingId opens that rating in edit mode with the kind picker', () => {
    renderCard('cr-none');
    expect(screen.getByLabelText('Ultralight kind')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('S1: editing a rating with no kind shows the placeholder and blocks saving until a kind is chosen', async () => {
    const user = userEvent.setup();
    renderCard('cr-none');
    const kind = screen.getByLabelText('Ultralight kind');
    expect(kind).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Select ultralight kind' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.selectOptions(kind, 'WEIGHT_SHIFT');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('editing a rating keeps its stored kind preselected', () => {
    renderCard('cr-3ax');
    expect(screen.getByLabelText('Ultralight kind')).toHaveValue('THREE_AXIS');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('M3: adding an ultralight rating cannot be saved without a kind', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: /add rating/i }));
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'ULTRALIGHT');
    const issue = document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement;
    await user.type(issue, '2026-05-01');
    expect(screen.getByLabelText('Ultralight kind')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Ultralight kind'), 'THREE_AXIS');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('opens nothing without editRatingId', () => {
    renderCard();
    expect(screen.queryByLabelText('Ultralight kind')).not.toBeInTheDocument();
  });
});
