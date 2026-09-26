import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TrainingProgressCard } from '../../components/currency/TrainingProgressCard';
import * as trainingHook from '../../hooks/useTrainingProgress';
import type { TrainingProgramme } from '../../hooks/useTrainingProgress';
import { PILOT_PROFILE_QUERY_KEY } from '../../hooks/invalidation';
import type { PilotProfile } from '../../hooks/usePilotProfile';
import { PERSONA_PROFILES, profileWith } from '../../test/pilotProfile';
import { useAuthStore } from '../../stores/authStore';
import i18n from '../../i18n';
import { annaSpl, jonasSpl } from './fixtures';

function renderCard(programmes: TrainingProgramme[], profile: PilotProfile = profileWith({ SAILPLANE: 'training' })) {
  vi.spyOn(trainingHook, 'useTrainingProgress').mockReturnValue({ data: { programmes }, isLoading: false } as never);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData([...PILOT_PROFILE_QUERY_KEY], profile);
  return render(
    <QueryClientProvider client={client}>
      <TrainingProgressCard />
    </QueryClientProvider>,
  );
}

const row = (key: string) => screen.getByTestId(`training-item-${key}`);

describe('TrainingProgressCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { timeDisplayFormat: 'hm' } as never });
  });
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('J1: Jonas sees SPL — SFCL.130 with the dual / supervised-solo split, launches and signed flights', () => {
    renderCard([jonasSpl()]);
    const card = screen.getByTestId('training-progress');
    expect(within(card).getByRole('heading', { name: 'Training progress' })).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: 'SPL — SFCL.130' })).toBeInTheDocument();

    expect(row('training.spl.dual_time')).toHaveTextContent('Dual instruction');
    expect(row('training.spl.dual_time')).toHaveTextContent('10h 21m / 10h 0m');
    expect(within(row('training.spl.dual_time')).getByTestId('training-met')).toBeInTheDocument();
    expect(within(row('training.spl.dual_time')).queryByTestId('training-message')).not.toBeInTheDocument();

    expect(row('training.spl.supervised_solo_time')).toHaveTextContent('Supervised solo');
    expect(row('training.spl.supervised_solo_time')).toHaveTextContent('1h 29m / 2h 0m');
    expect(within(row('training.spl.supervised_solo_time')).getByTestId('training-message')).toHaveTextContent('0h 31m to go');
    expect(within(row('training.spl.supervised_solo_time')).queryByTestId('training-met')).not.toBeInTheDocument();

    expect(row('training.spl.launches')).toHaveTextContent('92 / 45 launches');
    expect(within(row('training.spl.launches')).getByTestId('training-met')).toBeInTheDocument();
    expect(row('training.spl.cross_country')).toHaveTextContent('0 / 1 flights');
    expect(row('training.spl.cross_country')).toHaveTextContent('1 flight to go');

    expect(screen.getByTestId('training-signed-flights')).toHaveTextContent('7 flights signed by your instructor');
  });

  it('J1: minutes follow the user decimal format', () => {
    useAuthStore.setState({ user: { timeDisplayFormat: 'decimal', decimalSeparator: 'comma' } as never });
    renderCard([jonasSpl()]);
    expect(row('training.spl.instruction_time')).toHaveTextContent('11,8h / 15,0h');
  });

  it('J1: German wording', async () => {
    await i18n.changeLanguage('de');
    renderCard([jonasSpl()]);
    expect(screen.getByRole('heading', { name: 'Ausbildungsfortschritt' })).toBeInTheDocument();
    expect(row('training.spl.supervised_solo_time')).toHaveTextContent('Alleinflug unter Aufsicht');
    expect(row('training.spl.supervised_solo_time')).toHaveTextContent('Noch 0h 31m');
    expect(row('training.spl.launches')).toHaveTextContent('92 / 45 Starts');
    expect(screen.getByTestId('training-signed-flights')).toHaveTextContent('7 Flüge von deinem Fluglehrer unterschrieben');
  });

  it('N1: Anna sees the SFCL.130(b) credit as a note, not a progress bar', () => {
    renderCard([annaSpl()], profileWith({ AEROPLANE: 'active', SAILPLANE: 'training' }));
    expect(screen.queryByTestId('training-item-training.spl.credit_sfcl130b')).not.toBeInTheDocument();
    const note = screen.getByTestId('training-note-training.spl.credit_sfcl130b');
    expect(note).toHaveTextContent('Credit for your other licence (SFCL.130(b))');
    expect(note).toHaveTextContent('4h 4m can be credited toward flight instruction: 10 % of your PIC time on other aircraft');
    expect(screen.queryByTestId('training-signed-flights')).not.toBeInTheDocument();
    expect(screen.queryByText('All logged requirements met')).not.toBeInTheDocument();
  });

  it('shows the credit_none note', () => {
    const p = annaSpl();
    p.items[5] = { ...p.items[5], current: 0, met: false, messageKey: 'training.credit_none' };
    renderCard([p]);
    expect(screen.getByTestId('training-note-training.spl.credit_sfcl130b')).toHaveTextContent('no PIC time to credit yet');
  });

  it('flags a cross-country flight whose distance is unknown', () => {
    const p = jonasSpl();
    p.items[4] = { ...p.items[4], current: 1, met: true, messageKey: 'training.cross_country_distance_unknown' };
    renderCard([p]);
    const xc = row('training.spl.cross_country');
    expect(within(xc).getByTestId('training-met')).toBeInTheDocument();
    expect(within(xc).getByTestId('training-message')).toHaveTextContent('distance is unknown — check the route');
  });

  it('marks a programme with every item met; informational items do not block it', () => {
    const p = annaSpl();
    p.allMet = true;
    renderCard([p]);
    expect(screen.getByText('All logged requirements met')).toBeInTheDocument();
  });

  it('the details view lists the legal basis per item', () => {
    renderCard([annaSpl()]);
    expect(screen.queryByTestId('training-details-SPL')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('training-details-toggle-SPL'));
    const details = screen.getByTestId('training-details-SPL');
    expect(details).toHaveTextContent('Supervised solo · Legal basis: SFCL.130(a)');
    expect(details).toHaveTextContent('Credit for your other licence · Legal basis: SFCL.130(b)');
    expect(details).toHaveTextContent('at least 45');
    expect(screen.getByTestId('training-details-toggle-SPL')).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders every programme, UL units included', () => {
    renderCard([
      {
        id: 'UL_WEIGHT_SHIFT', discipline: 'ULTRALIGHT', titleKey: 'training.programme.ul_weight_shift', legalBasis: 'LuftPersV §42',
        allMet: false, signedFlights: 1,
        items: [{ key: 'training.ul.dual_time', current: 60, required: 600, unit: 'minutes', met: false, informational: false, messageKey: 'training.not_met' }],
      },
    ], profileWith({ ULTRALIGHT: 'training' }));
    expect(screen.getByRole('heading', { name: 'Sport pilot licence, trike (weight-shift) — LuftPersV §42' })).toBeInTheDocument();
    expect(screen.getByTestId('training-signed-flights')).toHaveTextContent('1 flight signed by your instructor');
  });

  it('M/R: Mark and Ruth get no programme and no card', () => {
    const { container } = renderCard([], PERSONA_PROFILES.mark());
    expect(container).toBeEmptyDOMElement();
    vi.restoreAllMocks();
    const ruth = renderCard([], profileWith({}));
    expect(ruth.container).toBeEmptyDOMElement();
  });

  it('data wins: a programme the API returns shows even when no toolkit is in training', () => {
    renderCard([jonasSpl()], PERSONA_PROFILES.mark());
    expect(screen.getByTestId('training-progress')).toBeInTheDocument();
  });
});
