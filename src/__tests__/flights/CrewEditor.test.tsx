import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CrewEditor } from '../../components/flights/CrewEditor';
import type { FlightCrewMemberInput } from '../../types/api';

vi.mock('../../hooks/useContacts', () => ({
  useSearchContacts: (q: string) => ({
    data: q.length >= 2 && 'bea ortiz'.startsWith(q.toLowerCase()) ? [{ id: 'c-9', userId: 'u', name: 'Bea Ortiz', createdAt: '', updatedAt: '' }] : [],
  }),
}));

const crew: FlightCrewMemberInput[] = [
  { contactId: 'c-1', name: 'Anna Imported', role: 'Student' },
  { contactId: null, name: 'Tom Becker', role: 'Passenger' },
];

describe('CrewEditor', () => {
  it('changes a role without touching the rest of the crew', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CrewEditor crew={crew} onChange={onChange} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role of Anna Imported' }), 'Instructor');

    expect(onChange).toHaveBeenCalledWith([
      { contactId: 'c-1', name: 'Anna Imported', role: 'Instructor' },
      crew[1],
    ]);
  });

  it('renames a person in place and drops the stale contact link', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CrewEditor crew={crew} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Change name of Anna Imported' }));
    const input = screen.getByRole('combobox', { name: 'Name of Anna Imported' });
    await user.clear(input);
    await user.type(input, 'Anna Richtig{Enter}');

    expect(onChange).toHaveBeenCalledWith([
      { contactId: null, name: 'Anna Richtig', role: 'Student' },
      crew[1],
    ]);
  });

  it('links the contact picked from the suggestions', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CrewEditor crew={crew} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Change name of Tom Becker' }));
    const input = screen.getByRole('combobox', { name: 'Name of Tom Becker' });
    await user.clear(input);
    await user.type(input, 'Be');
    await user.click(screen.getByRole('button', { name: 'Bea Ortiz' }));
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(onChange).toHaveBeenCalledWith([
      crew[0],
      { contactId: 'c-9', name: 'Bea Ortiz', role: 'Passenger' },
    ]);
  });

  it('cancels a rename on Escape', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CrewEditor crew={crew} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Change name of Anna Imported' }));
    await user.type(screen.getByRole('combobox', { name: 'Name of Anna Imported' }), 'xyz{Escape}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Change name of Anna Imported' })).toBeInTheDocument();
  });

  it('adds a person with Enter and reports the new name', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPersonAdded = vi.fn();
    render(<CrewEditor crew={[]} onChange={onChange} onPersonAdded={onPersonAdded} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role of the person to add' }), 'PIC');
    await user.type(screen.getByRole('combobox', { name: 'Name of the person to add' }), 'Jo Pilot{Enter}');

    expect(onChange).toHaveBeenCalledWith([{ contactId: null, name: 'Jo Pilot', role: 'PIC' }]);
    expect(onPersonAdded).toHaveBeenCalledWith('Jo Pilot');
  });

  it('is read-only when disabled', () => {
    render(<CrewEditor crew={crew} onChange={vi.fn()} disabled />);

    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
