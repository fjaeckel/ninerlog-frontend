import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { SoaringSeasonCard } from '../../components/dashboard/SoaringSeasonCard';
import { PERSONA_PROFILES } from '../../test/pilotProfile';
import type { PilotProfile } from '../../hooks/usePilotProfile';
import type { SoaringSeason } from '../../hooks/useSoaringSeason';

const state = vi.hoisted(() => ({
  profile: undefined as unknown,
  profileLoading: false,
  seasons: {} as Record<number, unknown>,
  loading: false,
  years: [] as number[],
}));

vi.mock('../../hooks/usePilotProfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/usePilotProfile')>();
  return {
    ...actual,
    useDisciplines: () => actual.resolveDisciplines(state.profile as PilotProfile | undefined, state.profileLoading),
  };
});

vi.mock('../../hooks/useSoaringSeason', () => ({
  useSoaringSeason: (year: number) => {
    state.years.push(year);
    return { data: state.loading ? undefined : state.seasons[year] ?? empty(year), isLoading: state.loading, isFetching: state.loading, isError: false };
  },
}));

const THIS_YEAR = new Date().getUTCFullYear();

function empty(year: number): SoaringSeason {
  return {
    year, flights: 0, launches: 0, totalMinutes: 0, averageFlightMinutes: 0, outlandings: 0, sites: [],
    launchesByMethod: { winch: 0, aerotow: 0, selfLaunch: 0, car: 0, bungee: 0, unspecified: 0 },
  };
}

const LENA_SEASON: SoaringSeason = {
  year: THIS_YEAR, flights: 48, launches: 52, totalMinutes: 3120, averageFlightMinutes: 65, outlandings: 1,
  launchesByMethod: { winch: 44, aerotow: 8, selfLaunch: 0, car: 0, bungee: 0, unspecified: 0 },
  longestFlight: { flightId: 'f7', date: `${THIS_YEAR}-07-12`, minutes: 312, aircraftReg: 'D-5678' },
  sites: [{ place: 'EDLO', flights: 45 }, { place: 'Wasserkuppe', flights: 3 }],
};

const renderCard = () => render(<BrowserRouter><SoaringSeasonCard /></BrowserRouter>);

beforeEach(() => {
  state.profile = PERSONA_PROFILES.lena();
  state.profileLoading = false;
  state.seasons = { [THIS_YEAR]: LENA_SEASON };
  state.loading = false;
  state.years = [];
});

describe('Soaring season card', () => {
  it('L Lena: launches by method, hours, average, outlandings, longest flight and sites', () => {
    renderCard();
    const card = within(screen.getByTestId('soaring-season'));
    expect(card.getByText('Soaring season')).toBeInTheDocument();
    expect(card.getByTestId('soaring-year')).toHaveTextContent(String(THIS_YEAR));
    expect(within(card.getByTestId('soaring-launches')).getByText('52')).toBeInTheDocument();
    expect(within(card.getByTestId('soaring-hours')).getByText('52h 0m')).toBeInTheDocument();
    expect(within(card.getByTestId('soaring-average')).getByText('1h 5m')).toBeInTheDocument();
    expect(within(card.getByTestId('soaring-outlandings')).getByText('1')).toBeInTheDocument();
    expect(within(card.getByTestId('soaring-method-winch')).getByText('Winch')).toBeInTheDocument();
    expect(within(card.getByTestId('soaring-method-aerotow')).getByText('8')).toBeInTheDocument();
    expect(card.queryByTestId('soaring-method-car')).not.toBeInTheDocument();
    expect(card.getByTestId('soaring-longest')).toHaveAttribute('href', '/flights/f7');
    expect(card.getByTestId('soaring-longest')).toHaveTextContent('5h 12m · D-5678');
    expect(within(card.getByTestId('soaring-sites')).getByText('Wasserkuppe')).toBeInTheDocument();
  });

  it('switches to the previous year and back; next is disabled on the current year', async () => {
    const user = userEvent.setup();
    renderCard();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByTestId('soaring-year')).toHaveTextContent(String(THIS_YEAR - 1));
    expect(state.years).toContain(THIS_YEAR - 1);
    expect(screen.getByTestId('soaring-empty')).toHaveTextContent(`No soaring flights in ${THIS_YEAR - 1}.`);
    await user.click(screen.getByRole('button', { name: 'Next year' }));
    expect(screen.getByTestId('soaring-year')).toHaveTextContent(String(THIS_YEAR));
  });

  it('P Petra (SAILPLANE active) sees the card even in a year without soaring flights', () => {
    state.profile = PERSONA_PROFILES.petra();
    state.seasons = {};
    renderCard();
    expect(screen.getByTestId('soaring-empty')).toBeInTheDocument();
  });

  it('A1 Mark: no card once loaded — never an empty card', () => {
    state.profile = PERSONA_PROFILES.mark();
    state.seasons = {};
    const { container } = renderCard();
    expect(screen.queryByTestId('soaring-season')).not.toBeInTheDocument();
    expect(screen.queryByTestId('soaring-season-skeleton')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('fail open: a skeleton while the pilot profile loads', () => {
    state.profile = undefined;
    state.profileLoading = true;
    renderCard();
    expect(screen.getByTestId('soaring-season-skeleton')).toBeInTheDocument();
  });

  it('a skeleton while the season loads', () => {
    state.loading = true;
    renderCard();
    expect(screen.getByTestId('soaring-season-skeleton')).toBeInTheDocument();
  });

  it('invariant 2 — Mark with soaring flights this year sees the card (data always wins)', () => {
    state.profile = PERSONA_PROFILES.mark();
    renderCard();
    expect(screen.getByTestId('soaring-season')).toBeInTheDocument();
  });

  it('K Karl (SAILPLANE dormant, no soaring flights): no card', () => {
    state.profile = PERSONA_PROFILES.karl();
    state.seasons = {};
    renderCard();
    expect(screen.queryByTestId('soaring-season')).not.toBeInTheDocument();
  });
});
