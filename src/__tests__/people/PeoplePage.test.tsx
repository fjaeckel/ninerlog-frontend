import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PeoplePage from '../../pages/people/PeoplePage';
import * as contactHooks from '../../hooks/useContacts';
import type { Contact } from '../../types/api';

vi.mock('../../hooks/useContacts');

const contacts: Contact[] = [
  {
    id: 'c1', userId: 'u1', name: 'Anna Meier', email: 'anna@example.com',
    phone: '+49 151 1234567', notes: 'CFI',
    createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'c2', userId: 'u1', name: 'Jonas Weber', email: null, phone: null, notes: null,
    createdAt: '2025-02-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z',
  },
];

const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><PeoplePage /></BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PeoplePage', () => {
  beforeEach(() => {
    vi.mocked(contactHooks.useContacts).mockReturnValue(
      { data: contacts, isLoading: false, error: null } as ReturnType<typeof contactHooks.useContacts>
    );
    vi.mocked(contactHooks.useCreateContact).mockReturnValue(
      mutation() as unknown as ReturnType<typeof contactHooks.useCreateContact>
    );
    vi.mocked(contactHooks.useUpdateContact).mockReturnValue(
      mutation() as unknown as ReturnType<typeof contactHooks.useUpdateContact>
    );
    vi.mocked(contactHooks.useDeleteContact).mockReturnValue(
      mutation() as unknown as ReturnType<typeof contactHooks.useDeleteContact>
    );
  });

  it('renders the people list', () => {
    renderPage();
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText('Anna Meier')).toBeInTheDocument();
    expect(screen.getByText('Jonas Weber')).toBeInTheDocument();
    expect(screen.getByText('No contact details')).toBeInTheDocument();
  });

  it('filters the list by search text', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Search people'), 'anna');
    expect(screen.getByText('Anna Meier')).toBeInTheDocument();
    expect(screen.queryByText('Jonas Weber')).not.toBeInTheDocument();
  });

  it('opens the edit form pre-filled and saves via the update hook', async () => {
    const update = mutation();
    vi.mocked(contactHooks.useUpdateContact).mockReturnValue(
      update as unknown as ReturnType<typeof contactHooks.useUpdateContact>
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText('Edit Anna Meier'));
    expect(screen.getByLabelText(/Name/)).toHaveValue('Anna Meier');
    await user.clear(screen.getByLabelText(/Name/));
    await user.type(screen.getByLabelText(/Name/), 'Anna Meier-Huber');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(update.mutateAsync).toHaveBeenCalledWith({
      id: 'c1',
      data: { name: 'Anna Meier-Huber', email: 'anna@example.com', phone: '+49 151 1234567', notes: 'CFI' },
    });
  });

  it('asks for confirmation before deleting', async () => {
    const del = mutation();
    vi.mocked(contactHooks.useDeleteContact).mockReturnValue(
      del as unknown as ReturnType<typeof contactHooks.useDeleteContact>
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText('Delete Jonas Weber'));
    expect(del.mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete person' }));
    expect(del.mutateAsync).toHaveBeenCalledWith('c2');
  });

  it('shows the empty state when there are no contacts', () => {
    vi.mocked(contactHooks.useContacts).mockReturnValue(
      { data: [], isLoading: false, error: null } as unknown as ReturnType<typeof contactHooks.useContacts>
    );
    renderPage();
    expect(screen.getByText('No people yet')).toBeInTheDocument();
  });
});
