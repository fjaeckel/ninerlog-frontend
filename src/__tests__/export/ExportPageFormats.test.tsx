import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExportPage from '../../pages/export/ExportPage';
import * as licensesHook from '../../hooks/useLicenses';
import { PERSONA_PROFILES } from '../../test/pilotProfile';
import type { PilotProfile } from '../../hooks/usePilotProfile';

const profileState = vi.hoisted(() => ({ profile: undefined as unknown }));
vi.mock('../../hooks/usePilotProfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/usePilotProfile')>();
  return {
    ...actual,
    useDisciplines: () => actual.resolveDisciplines(profileState.profile as PilotProfile | undefined, false),
  };
});

const LICENCES = [
  { id: 'l-spl', regulatoryAuthority: 'EASA', licenseType: 'SPL', licenseNumber: 'DE.SFCL.1', issuingAuthority: 'LBA' },
  { id: 'l-ul', regulatoryAuthority: 'DULV', licenseType: 'UL', licenseNumber: 'UL-1', issuingAuthority: 'DULV' },
  { id: 'l-ppl', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)', licenseNumber: 'DE.FCL.1', issuingAuthority: 'LBA' },
];

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );

const formatSelect = () => screen.getByRole('combobox', { name: 'PDF format' }) as HTMLSelectElement;
const logbookSelect = () => screen.getByRole('combobox', { name: 'Logbook' });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.restoreAllMocks();
  profileState.profile = PERSONA_PROFILES.lena();
  vi.spyOn(licensesHook, 'useLicenses').mockReturnValue({ data: LICENCES } as never);
  fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['%PDF'])) });
  global.fetch = fetchMock as never;
  global.URL.createObjectURL = vi.fn(() => 'blob:test');
  global.URL.revokeObjectURL = vi.fn();
});

describe('Export page — printed logbook formats', () => {
  it('L Lena: choosing her SPL logbook preselects the sailplane format and says so', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(formatSelect().value).toBe('easa');
    await user.selectOptions(logbookSelect(), 'l-spl');
    expect(formatSelect().value).toBe('sailplane');
    expect(screen.getByTestId('pdf-format-auto')).toHaveTextContent(
      'Sailplane logbook (SFCL.050) — the layout for your EASA SPL logbook',
    );
    expect(screen.queryByRole('combobox', { name: 'Page layout' })).not.toBeInTheDocument();

    await user.click(screen.getByText('Download PDF logbook'));
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('logbookLicenseId=l-spl');
    expect(url).toContain('format=sailplane');
    expect(url).not.toContain('layout=');
  });

  it('M/S: a DULV UL licence preselects the ultralight format', async () => {
    const user = userEvent.setup();
    profileState.profile = PERSONA_PROFILES.mehmet();
    renderPage();
    await user.selectOptions(logbookSelect(), 'l-ul');
    expect(formatSelect().value).toBe('ultralight');
    expect(screen.getByTestId('pdf-format-auto')).toHaveTextContent('Ultralight logbook');
  });

  it('a PPL(A) logbook keeps EASA without a note, and the layout picker stays', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(logbookSelect(), 'l-ppl');
    expect(formatSelect().value).toBe('easa');
    expect(screen.queryByTestId('pdf-format-auto')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Page layout' })).toBeInTheDocument();
  });

  it('an explicit pick wins over the licence default', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(formatSelect(), 'faa');
    await user.selectOptions(logbookSelect(), 'l-spl');
    expect(formatSelect().value).toBe('faa');
    expect(screen.queryByTestId('pdf-format-auto')).not.toBeInTheDocument();
  });

  it('L Lena: sailplane format is offered first, ultralight under "More formats"', () => {
    renderPage();
    const more = screen.getByTestId('more-formats');
    expect(within(more).getByRole('option', { name: 'Ultralight logbook' })).toBeInTheDocument();
    expect(within(more).queryByRole('option', { name: 'Sailplane logbook (SFCL.050)' })).not.toBeInTheDocument();
    expect(within(formatSelect()).getByRole('option', { name: 'Sailplane logbook (SFCL.050)' })).toBeInTheDocument();
  });

  it('A1 Mark: both glider/UL formats fold under "More formats", never removed', () => {
    profileState.profile = PERSONA_PROFILES.mark();
    renderPage();
    const more = within(screen.getByTestId('more-formats'));
    expect(more.getByRole('option', { name: 'Sailplane logbook (SFCL.050)' })).toBeInTheDocument();
    expect(more.getByRole('option', { name: 'Ultralight logbook' })).toBeInTheDocument();
    expect(formatSelect().value).toBe('easa');
  });
});
