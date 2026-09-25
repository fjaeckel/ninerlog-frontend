import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlightCrewCard } from '../../components/flights/FlightCrewCard';

const mutateAsync = vi.fn();

vi.mock('../../hooks/useFlights', () => ({
  useUpdateFlight: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('../../hooks/useContacts', () => ({
  useSearchContacts: () => ({ data: [] }),
}));

const baseFlight = {
  id: 'flight-1',
  signatureId: null,
  crewMembers: [
    { id: 'cm-1', flightId: 'flight-1', contactId: 'c-1', name: 'Anna Imported', role: 'Student' },
    { id: 'cm-2', flightId: 'flight-1', contactId: null, name: 'Tom Becker', role: 'PIC' },
  ],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('FlightCrewCard', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
  });

  it('saves a role change right away with the derived names', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValueOnce({});
    render(<FlightCrewCard flight={baseFlight} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role of Anna Imported' }), 'Instructor');

    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'flight-1',
      data: {
        crewMembers: [
          { contactId: 'c-1', name: 'Anna Imported', role: 'Instructor' },
          { contactId: null, name: 'Tom Becker', role: 'PIC' },
        ],
        instructorName: 'Anna Imported',
        picName: 'Tom Becker',
      },
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role of Anna Imported' })).toHaveValue('Instructor');
  });

  it('undoes the last change', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValue({});
    render(<FlightCrewCard flight={baseFlight} />);

    await user.click(screen.getByRole('button', { name: 'Remove Tom Becker' }));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          crewMembers: [
            { contactId: 'c-1', name: 'Anna Imported', role: 'Student' },
            { contactId: null, name: 'Tom Becker', role: 'PIC' },
          ],
        }),
      })
    );
  });

  it('reverts and shows the error when saving fails', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce({ error: 'This flight is locked by a completed signature.' });
    render(<FlightCrewCard flight={baseFlight} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role of Anna Imported' }), 'Examiner');

    expect(await screen.findByRole('alert')).toHaveTextContent('This flight is locked by a completed signature.');
    expect(screen.getByRole('combobox', { name: 'Role of Anna Imported' })).toHaveValue('Student');
  });

  it('is read-only on a signed flight', () => {
    render(<FlightCrewCard flight={{ ...baseFlight, signatureId: 'sig-1' }} />);

    expect(screen.getByText(/locked by the instructor signature/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders nothing for a signed flight without crew', () => {
    const { container } = render(<FlightCrewCard flight={{ ...baseFlight, signatureId: 'sig-1', crewMembers: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers adding a person on an unsigned flight without crew', () => {
    render(<FlightCrewCard flight={{ ...baseFlight, crewMembers: [] }} />);
    expect(screen.getByText(/no one else on board/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Person name')).toBeInTheDocument();
  });
});
