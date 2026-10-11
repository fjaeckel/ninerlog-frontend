import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RestoreBackup from '../../pages/import/RestoreBackup';
import * as useImportHook from '../../hooks/useImport';
import { RestoreError } from '../../hooks/useImport';
import type { ImportJSONResult } from '../../hooks/useImport';

const RESULT: ImportJSONResult = {
  aircraftImported: 2,
  aircraftSkipped: 0,
  licensesImported: 1,
  classRatingsImported: 2,
  credentialsImported: 1,
  flightsImported: 120,
  crewMembersImported: 4,
  contactsImported: 3,
  contactsSkipped: 0,
  contactsCreated: 0,
  customCurrencyRulesImported: 1,
  customReportsImported: 1,
  flightRevisionsImported: 0,
  logbookCertificationsImported: 0,
  notificationPreferencesImported: true,
  flightBaselineImported: true,
  mode: 'restore',
  warnings: [],
};

const mutateAsync = vi.fn();

function selectBackup() {
  const file = new File(['{"format":"NinerLog JSON Backup"}'], 'logbook.json', { type: 'application/json' });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('RestoreBackup', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    vi.spyOn(useImportHook, 'useRestoreJSON').mockReturnValue(
      { mutateAsync, isPending: false } as unknown as ReturnType<typeof useImportHook.useRestoreJSON>
    );
  });

  it('H2: restores into an empty account and shows the summary', async () => {
    mutateAsync.mockResolvedValueOnce(RESULT);
    render(<RestoreBackup />);
    const file = selectBackup();

    await screen.findByText('Backup restored');
    expect(mutateAsync).toHaveBeenCalledWith({ file, mode: 'restore' });
    expect(screen.getByText('Your data was successfully imported into this account.')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.queryByText(/need a second look/)).not.toBeInTheDocument();
  });

  it('H2: asks before replacing a non-empty account and retries with mode=replace on the same file', async () => {
    mutateAsync
      .mockRejectedValueOnce(new RestoreError('account_not_empty', 'already holds data', 409))
      .mockResolvedValueOnce({ ...RESULT, mode: 'replace' });
    render(<RestoreBackup />);
    const file = selectBackup();

    await screen.findByRole('heading', { name: 'This account already holds logbook data' });
    expect(screen.getByText(/deletes the current logbook data of this account/)).toBeInTheDocument();
    expect(screen.getByText(/all-or-nothing/)).toBeInTheDocument();
    expect(screen.getByText('Backup: logbook.json')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Replace everything' }));

    await screen.findByText('Backup restored');
    expect(mutateAsync).toHaveBeenLastCalledWith({ file, mode: 'replace' });
    expect(screen.getByText('Your previous logbook data was replaced with the backup.')).toBeInTheDocument();
  });

  it('cancelling the replace confirmation returns to the file picker without a second request', async () => {
    mutateAsync.mockRejectedValueOnce(new RestoreError('account_not_empty', '', 409));
    render(<RestoreBackup />);
    selectBackup();

    await screen.findByRole('button', { name: 'Replace everything' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Choose JSON backup' })).toBeInTheDocument();
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('explains why replace is refused when the account holds documents or signed flights', async () => {
    mutateAsync
      .mockRejectedValueOnce(new RestoreError('account_not_empty', '', 409))
      .mockRejectedValueOnce(new RestoreError('replace_would_drop_attachments', '', 409));
    render(<RestoreBackup />);
    selectBackup();

    fireEvent.click(await screen.findByRole('button', { name: 'Replace everything' }));

    await screen.findByRole('heading', { name: 'Replacing is not possible for this account' });
    expect(screen.getByText(/document files \(license or credential scans\) or signed flights/)).toBeInTheDocument();
    expect(screen.getByText(/Restore the backup into an empty account instead/)).toBeInTheDocument();
    expect(screen.getByText('Nothing has been changed.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Choose another backup' }));
    expect(screen.getByRole('button', { name: 'Choose JSON backup' })).toBeInTheDocument();
  });

  it('lists restore warnings in a collapsed section', async () => {
    mutateAsync.mockResolvedValueOnce({
      ...RESULT,
      warnings: [
        { section: 'customCurrencyRules', index: 2, message: 'restored paused - the definition no longer passes validation' },
        { section: 'somethingNew', index: 0, message: 'check me' },
      ],
    });
    render(<RestoreBackup />);
    selectBackup();

    const summary = await screen.findByText('2 entries need a second look');
    const details = summary.closest('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('Custom currency rules · entry 3')).toBeInTheDocument();
    expect(screen.getByText('restored paused - the definition no longer passes validation')).toBeInTheDocument();
    expect(screen.getByText('somethingNew · entry 1')).toBeInTheDocument();
  });

  it.each([
    ['too_large', 'This backup is larger than the 200 MB the server accepts.'],
    ['backup_version_unsupported', /made by a newer version of NinerLog/],
    ['invalid_json', 'The selected file is not valid JSON.'],
    ['not_a_backup', 'The selected file is not a NinerLog JSON backup.'],
  ] as const)('shows a specific message for %s', async (kind, message) => {
    mutateAsync.mockRejectedValueOnce(new RestoreError(kind, 'server text', 413));
    render(<RestoreBackup />);
    selectBackup();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('shows the API message of any other failure', async () => {
    mutateAsync.mockRejectedValueOnce(new RestoreError('generic', 'Unsupported backup format', 400));
    render(<RestoreBackup />);
    selectBackup();

    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported backup format');
  });
});
