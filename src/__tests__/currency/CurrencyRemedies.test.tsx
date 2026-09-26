import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { CurrencyCard } from '../../components/currency/CurrencyCard';
import { useCurrencyMessages } from '../../lib/currencyMessages';
import { useAuthStore } from '../../stores/authStore';
import i18n from '../../i18n';
import type { ClassRatingCurrency } from '../../types/api';

afterEach(async () => {
  await i18n.changeLanguage('en');
  useAuthStore.setState({ user: null });
});

const messages = () => renderHook(() => useCurrencyMessages()).result.current;

const lenaSpl = (overrides: Partial<ClassRatingCurrency> = {}): ClassRatingCurrency => ({
  classRatingId: 'cr1',
  classType: 'GLIDER',
  licenseId: 'l1',
  regulatoryAuthority: 'EASA',
  licenseType: 'SPL',
  status: 'current',
  message: '',
  messageKey: 'rating.recency_current',
  validUntil: '2027-06-14',
  requirements: [
    { nameKey: 'requirement.launches', met: true, current: 139, required: 15, unit: 'launches', messageKey: 'requirement.progress', validUntil: '2027-06-14' },
    { nameKey: 'requirement.proficiency_check', met: false, current: 0, required: 1, unit: 'check', messageKey: 'requirement.prof_check_missing', remedyKey: 'remedy.proficiency_check' },
  ],
  launchMethodCurrency: [
    { method: 'winch', launches: 126, required: 5, met: true, message: '', messageKey: 'launch_method.progress', validUntil: '2028-08-07' },
    {
      method: 'aerotow', launches: 3, required: 5, met: false, message: '', messageKey: 'launch_method.progress',
      remedyKey: 'remedy.launch_method_dual', remedyParams: { method: 'aerotow', missing: 2 },
    },
  ],
  ...overrides,
});

describe('remedy text', () => {
  it('L4: remedy.launch_method_dual names the launches and the method (en)', () => {
    expect(messages().remedy({ remedyKey: 'remedy.launch_method_dual', remedyParams: { method: 'aerotow', missing: 2 } }))
      .toBe('Fly 2 more launches dual or supervised solo (Aerotow)');
    expect(messages().remedy({ remedyKey: 'remedy.launch_method_dual', remedyParams: { method: 'winch', missing: 1 } }))
      .toBe('Fly 1 more launch dual or supervised solo (Winch)');
  });

  it('L4: remedy.launch_method_dual in German uses the Luftsport terms', async () => {
    await i18n.changeLanguage('de');
    expect(messages().remedy({ remedyKey: 'remedy.launch_method_dual', remedyParams: { method: 'aerotow', missing: 2 } }))
      .toBe('Noch 2 Starts im Doppelsitzer oder unter Aufsicht (F-Schlepp)');
  });

  it('remedy.fly_more localises the unit, minutes in the user time format (en + de)', async () => {
    const m = messages();
    expect(m.remedy({ remedyKey: 'remedy.fly_more', remedyParams: { missing: 5, unit: 'launches' } })).toBe('Fly 5 more launches');
    expect(m.remedy({ remedyKey: 'remedy.fly_more', remedyParams: { missing: 1, unit: 'flights' } })).toBe('Fly 1 more flight');
    expect(m.remedy({ remedyKey: 'remedy.fly_more', remedyParams: { missing: 3, unit: 'landings' } })).toBe('Fly 3 more take-offs and landings');
    expect(m.remedy({ remedyKey: 'remedy.fly_more', remedyParams: { missing: 90, unit: 'minutes' } })).toBe('Fly another 1h 30m');

    useAuthStore.setState({ user: { timeDisplayFormat: 'decimal', decimalSeparator: 'comma' } as never });
    await i18n.changeLanguage('de');
    const de = messages();
    expect(de.remedy({ remedyKey: 'remedy.fly_more', remedyParams: { missing: 90, unit: 'minutes' } })).toBe('Noch 1,5h fliegen');
    expect(de.remedy({ remedyKey: 'remedy.fly_more', remedyParams: { missing: 2, unit: 'launches' } })).toBe('Noch 2 Starts fliegen');
  });

  it('renders training flight and proficiency check remedies (en + de)', async () => {
    expect(messages().remedy({ remedyKey: 'remedy.training_flight' })).toBe('Fly one training flight of at least 1 h with an instructor');
    expect(messages().remedy({ remedyKey: 'remedy.proficiency_check' })).toBe('Take a proficiency check with an examiner');
    await i18n.changeLanguage('de');
    expect(messages().remedy({ remedyKey: 'remedy.training_flight' })).toBe('Einen Übungsflug von mindestens 1 h mit Fluglehrer fliegen');
  });

  it('an unknown remedy key falls back to generic text (CURRENCY_MESSAGES.md rule 1)', async () => {
    expect(messages().remedy({ remedyKey: 'remedy.fly_to_the_moon', remedyParams: { missing: 1 } }))
      .toBe('Fly the missing experience to restore this.');
    expect(messages().remedy({ remedyKey: 'remedy.fly_more' })).toBe('Fly the missing experience to restore this.');
    await i18n.changeLanguage('de');
    expect(messages().remedy({ remedyKey: 'remedy.fly_to_the_moon' }))
      .toBe('Die fehlende Flugerfahrung nachholen, um dies wiederherzustellen.');
  });

  it('an unknown readiness reason key falls back to generic text', () => {
    expect(messages().readinessReason({ reasonKey: 'readiness.something_new' })).toBe('No details are available for this status.');
  });
});

describe('CurrencyCard validUntil and remedies', () => {
  it('L4: shows validUntil on met rows, the current rating and met launch methods, in the user date format', () => {
    render(<CurrencyCard rating={lenaSpl()} />);
    expect(screen.getByTestId('requirement-requirement.launches-valid-until')).toHaveTextContent('valid until 14.06.2027');
    expect(screen.getByTestId('launch-method-winch-valid-until')).toHaveTextContent('valid until 07.08.2028');
    expect(screen.getByTestId('currency-valid-until')).toHaveTextContent('Current until 14.06.2027');
  });

  it('follows the user date format and German wording', async () => {
    useAuthStore.setState({ user: { dateFormat: 'YYYY-MM-DD' } as never });
    await i18n.changeLanguage('de');
    render(<CurrencyCard rating={lenaSpl()} />);
    expect(screen.getByTestId('requirement-requirement.launches-valid-until')).toHaveTextContent('gültig bis 2027-06-14');
    expect(screen.getByTestId('currency-valid-until')).toHaveTextContent('Gültig bis 2027-06-14');
  });

  it('L4: an unmet launch method shows its remedy; the unused proficiency check of a current rating does not', () => {
    render(<CurrencyCard rating={lenaSpl()} />);
    expect(within(screen.getByTestId('launch-method-aerotow')).getByTestId('launch-method-aerotow-remedy'))
      .toHaveTextContent('Fly 2 more launches dual or supervised solo (Aerotow)');
    expect(screen.queryByTestId('requirement-requirement.proficiency_check-remedy')).not.toBeInTheDocument();
  });

  it('K2: a lapsed rating shows the remedy on each unmet row and no validUntil', () => {
    render(
      <CurrencyCard
        rating={lenaSpl({
          status: 'lapsed',
          messageKey: 'rating.recency_not_met',
          validUntil: undefined,
          requirements: [
            { nameKey: 'requirement.launches', met: false, current: 0, required: 15, unit: 'launches', messageKey: 'requirement.progress', remedyKey: 'remedy.fly_more', remedyParams: { missing: 15, unit: 'launches' } },
            { nameKey: 'requirement.proficiency_check', met: false, current: 0, required: 1, unit: 'check', messageKey: 'requirement.prof_check_missing', remedyKey: 'remedy.proficiency_check' },
          ],
        })}
      />,
    );
    expect(screen.getByTestId('requirement-requirement.launches-remedy')).toHaveTextContent('Fly 15 more launches');
    expect(screen.getByTestId('requirement-requirement.proficiency_check-remedy')).toHaveTextContent('Take a proficiency check with an examiner');
    expect(screen.queryByTestId('currency-valid-until')).not.toBeInTheDocument();
  });
});
