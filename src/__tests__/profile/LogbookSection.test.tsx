import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogbookSection } from '../../components/profile/LogbookSection';
import type { LogbookMode } from '../../hooks/useLogbook';

const state: { mode: LogbookMode } = { mode: null as unknown as LogbookMode };
const updateMode = vi.fn();
const certify = vi.fn();

vi.mock('../../hooks/useLogbook', () => ({
  useLogbookMode: () => ({ data: state.mode, isLoading: false, isError: false }),
  useUpdateLogbookMode: () => ({ mutateAsync: updateMode, isPending: false }),
  useLogbookCertifications: () => ({
    data: [{ id: 'c1', certifiedThrough: '2026-07-01', certifiedAt: '2026-07-02T10:00:00Z' }],
  }),
  useCreateLogbookCertification: () => ({ mutateAsync: certify, isPending: false }),
}));

const de = {
  licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)', issuingCountry: 'DE',
  draftWindow: 'flight_day' as const, basis: 'NfL 2212-21',
};

const baseMode: LogbookMode = {
  strict: false, since: null, draftWindow: null, overridesDownwardOnly: false, latestCertifiedThrough: null,
  requiredBy: [], suggestedBy: [], events: [],
};

describe('LogbookSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMode.mockResolvedValue(baseMode);
  });

  it('switches strict mode on and shows the notice', async () => {
    state.mode = baseMode;
    render(<LogbookSection />);
    expect(screen.getByText(/strict mode has never been switched on/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /strict logbook mode/i }));
    expect(updateMode).toHaveBeenCalledWith(true);
    const notice = await screen.findByRole('dialog', { name: /strict logbook mode is on/i });
    expect(notice).toHaveTextContent(/never recorded with history/i);
  });

  it('warns before switching off while a licence requires strict mode', async () => {
    state.mode = {
      ...baseMode, strict: true, since: '2026-07-17T10:00:00Z', draftWindow: 'flight_day', requiredBy: [de],
      events: [{ strict: true, trigger: 'licence', licenseId: 'l1', createdAt: '2026-07-17T10:00:00Z' }],
    };
    render(<LogbookSection />);
    expect(screen.getByText(/required by easa ppl\(a\) \(germany\)/i)).toBeInTheDocument();
    expect(screen.getByText(/history recorded since/i)).toBeInTheDocument();
    expect(screen.getByText('Switched on')).toBeInTheDocument();
    expect(screen.getByText('by a licence')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /strict logbook mode/i }));
    expect(updateMode).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/turning strict mode off stops recording/i);

    await userEvent.click(screen.getByRole('button', { name: /turn off/i }));
    await waitFor(() => expect(updateMode).toHaveBeenCalledWith(false));
  });

  it('switches off without a warning when no licence requires strict mode', async () => {
    state.mode = { ...baseMode, strict: true, since: '2026-07-17T10:00:00Z' };
    render(<LogbookSection />);
    await userEvent.click(screen.getByRole('checkbox', { name: /strict logbook mode/i }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(updateMode).toHaveBeenCalledWith(false);
  });

  it('certifies the logbook and maps API error codes', async () => {
    state.mode = { ...baseMode, strict: true, since: '2026-07-17T10:00:00Z', latestCertifiedThrough: '2026-07-01' };
    certify.mockRejectedValueOnce({ error: 'x', code: 'certification_before_latest' });
    render(<LogbookSection />);
    expect(screen.getByText(/past certifications/i)).toBeInTheDocument();

    const input = screen.getByLabelText(/certified through/i);
    expect(input).toHaveAttribute('min', '2026-07-01');
    await userEvent.clear(input);
    await userEvent.type(input, '2026-07-10');
    await userEvent.click(screen.getByRole('button', { name: /^certify$/i }));
    expect(certify).toHaveBeenCalledWith('2026-07-10');
    expect(await screen.findByText(/cannot be before your latest certification/i)).toBeInTheDocument();
  });

  it('defaults to local today as the latest date and maps the other certification errors inline', async () => {
    state.mode = { ...baseMode, strict: true, since: '2026-07-17T10:00:00Z' };
    certify
      .mockRejectedValueOnce({ error: 'certifiedThrough is in the future', code: 'certification_in_future', httpStatus: 422 })
      .mockRejectedValueOnce({ error: 'Strict mode is required', code: 'strict_mode_required', httpStatus: 409 });
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    render(<LogbookSection />);

    const input = screen.getByLabelText(/certified through/i);
    expect(input).toHaveValue(today);
    expect(input).toHaveAttribute('max', today);

    await userEvent.click(screen.getByRole('button', { name: /^certify$/i }));
    expect(await screen.findByText('The date cannot be in the future.')).toBeInTheDocument();
    expect(screen.queryByText('certifiedThrough is in the future')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^certify$/i }));
    expect(await screen.findByText('Switch strict mode on to certify the logbook.')).toBeInTheDocument();
    expect(screen.queryByText('The date cannot be in the future.')).not.toBeInTheDocument();
  });

  it('disables certification outside strict mode', () => {
    state.mode = baseMode;
    render(<LogbookSection />);
    expect(screen.getByRole('button', { name: /^certify$/i })).toBeDisabled();
    expect(screen.getByText(/switch strict mode on to certify/i)).toBeInTheDocument();
  });

  it('opens “What NinerLog records”', async () => {
    state.mode = baseMode;
    render(<LogbookSection />);
    await userEvent.click(screen.getByRole('button', { name: /what ninerlog records/i }));
    expect(screen.getByRole('dialog', { name: /what ninerlog records/i })).toHaveTextContent(
      /in standard mode, edits overwrite/i
    );
  });
});
