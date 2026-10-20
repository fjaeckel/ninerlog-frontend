import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('asks for a correction reason, keeps the change meanwhile and resubmits with it', async () => {
    const user = userEvent.setup();
    mutateAsync
      .mockRejectedValueOnce({ error: 'needs a reason', code: 'correction_reason_required', httpStatus: 422 })
      .mockResolvedValueOnce({});
    render(<FlightCrewCard flight={baseFlight} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role of Anna Imported' }), 'Instructor');

    const dialog = await screen.findByRole('dialog', { name: /reason for the correction/i });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /close/i })).toHaveFocus());
    expect(screen.getByRole('combobox', { name: 'Role of Anna Imported' })).toHaveValue('Instructor');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.type(within(dialog).getByRole('textbox', { name: /reason/i }), 'Instructor was on board');
    await user.click(within(dialog).getByRole('button', { name: /save correction/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[1][0]).toEqual({
      id: 'flight-1',
      data: expect.objectContaining({
        correctionReason: 'Instructor was on board',
        crewMembers: [
          { contactId: 'c-1', name: 'Anna Imported', role: 'Instructor' },
          { contactId: null, name: 'Tom Becker', role: 'PIC' },
        ],
      }),
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rolls the change back when the correction reason is cancelled', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce({ error: 'needs a reason', code: 'correction_reason_required', httpStatus: 422 });
    render(<FlightCrewCard flight={baseFlight} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role of Anna Imported' }), 'Instructor');
    const dialog = await screen.findByRole('dialog', { name: /reason for the correction/i });
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role of Anna Imported' })).toHaveValue('Student');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('shows a localized message when the correction reason is too long', async () => {
    const user = userEvent.setup();
    mutateAsync
      .mockRejectedValueOnce({ error: 'needs a reason', code: 'correction_reason_required', httpStatus: 422 })
      .mockRejectedValueOnce({ error: 'correctionReason is too long', httpStatus: 400 });
    render(<FlightCrewCard flight={baseFlight} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role of Anna Imported' }), 'Instructor');
    const dialog = await screen.findByRole('dialog', { name: /reason for the correction/i });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /close/i })).toHaveFocus());
    await user.type(within(dialog).getByRole('textbox', { name: /reason/i }), 'x');
    await user.click(within(dialog).getByRole('button', { name: /save correction/i }));

    expect(await within(dialog).findByText(/the reason is too long\. use at most 500 characters/i)).toBeInTheDocument();
    expect(within(dialog).queryByText('correctionReason is too long')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role of Anna Imported' })).toHaveValue('Instructor');
  });

  it('maps a 409 lock to a localized message', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce({ error: 'locked', httpStatus: 409 });
    render(<FlightCrewCard flight={baseFlight} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Role of Anna Imported' }), 'Examiner');
    expect(await screen.findByRole('alert')).toHaveTextContent(/void the signature to change it/i);
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
