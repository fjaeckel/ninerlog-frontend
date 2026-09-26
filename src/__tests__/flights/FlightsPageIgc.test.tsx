import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlightsPage from '../../pages/flights/FlightsPage';
import userEvent from '@testing-library/user-event';
import { FoldDrawer, Relevant } from '../../components/relevance';
import { IgcImportCard } from '../../components/flights/igc/IgcImportEntry';
import * as useFlightsHook from '../../hooks/useFlights';
import * as useLicensesHook from '../../hooks/useLicenses';
import { PERSONA_PROFILES } from '../../test/pilotProfile';
import type { PilotProfile } from '../../hooks/usePilotProfile';

const profileState = vi.hoisted(() => ({ profile: undefined as unknown, isLoading: true }));

vi.mock('../../hooks/usePilotProfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/usePilotProfile')>();
  return {
    ...actual,
    useDisciplines: () => actual.resolveDisciplines(profileState.profile as PilotProfile | undefined, profileState.isLoading),
  };
});

const asProfile = (profile: PilotProfile | undefined, isLoading = false) => {
  profileState.profile = profile;
  profileState.isLoading = isLoading;
};

const renderUi = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/flights']}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

const entry = () => screen.queryByRole('link', { name: 'Import IGC' });

beforeEach(() => {
  vi.restoreAllMocks();
  const page = { data: { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }, isLoading: false, error: null };
  vi.spyOn(useFlightsHook, 'useFlights').mockReturnValue(page as never);
  vi.spyOn(useFlightsHook, 'useInfiniteFlights').mockReturnValue({ data: undefined, isLoading: false, error: null } as never);
  vi.spyOn(useFlightsHook, 'useDeleteFlight').mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never);
  vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: [] } as never);
});

describe('Flights page IGC entry', () => {
  it('P2 Petra sees "Import IGC" on the flights page', () => {
    asProfile(PERSONA_PROFILES.petra());
    renderUi(<FlightsPage />);
    expect(entry()).toHaveAttribute('href', '/flights/import-igc');
  });

  it('L1 Lena sees "Import IGC"', () => {
    asProfile(PERSONA_PROFILES.lena());
    renderUi(<FlightsPage />);
    expect(entry()).toBeInTheDocument();
  });

  it('A1 Mark sees no IGC entry once the profile has loaded', () => {
    asProfile(PERSONA_PROFILES.mark());
    renderUi(<FlightsPage />);
    expect(entry()).not.toBeInTheDocument();
  });

  it('fails open while the profile is loading', () => {
    asProfile(undefined, true);
    renderUi(<FlightsPage />);
    expect(entry()).toBeInTheDocument();
  });
});

describe('Import page IGC card', () => {
  const importSection = () => (
    <FoldDrawer>
      <Relevant id="flight.igcImport">
        <IgcImportCard />
      </Relevant>
    </FoldDrawer>
  );

  it('A1 Mark finds the IGC import folded into "More", never removed', async () => {
    asProfile(PERSONA_PROFILES.mark());
    renderUi(importSection());
    expect(screen.queryByTestId('igc-import-card')).not.toBeInTheDocument();
    await userEvent.setup().click(within(screen.getByTestId('fold-drawer')).getByRole('button'));
    expect(await screen.findByTestId('igc-import-card')).toBeInTheDocument();
  });

  it('P2 Petra sees the IGC import card directly', () => {
    asProfile(PERSONA_PROFILES.petra());
    renderUi(importSection());
    expect(screen.getByTestId('igc-import-card')).toBeInTheDocument();
    expect(screen.queryByTestId('fold-drawer')).not.toBeInTheDocument();
  });
});
