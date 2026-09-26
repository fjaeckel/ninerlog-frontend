import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SeasonStartPlanner } from '../../components/currency/SeasonStartPlanner';
import * as currencyHook from '../../hooks/useCurrency';
import type { ClassRatingCurrency } from '../../types/api';

const mockRatings = (ratings: ClassRatingCurrency[] | undefined) =>
  vi.spyOn(currencyHook, 'useAllCurrencyStatus').mockReturnValue({
    data: ratings ? { ratings, passengerCurrency: [] } : undefined,
    isLoading: false,
  } as never);

const karlGlider: ClassRatingCurrency = {
  classRatingId: 'cr1', classType: 'GLIDER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
  status: 'lapsed', message: '', messageKey: 'rating.recency_not_met',
  requirements: [
    { nameKey: 'requirement.flight_time', met: true, current: 900, required: 300, unit: 'minutes', messageKey: 'requirement.progress' },
    { nameKey: 'requirement.launches', met: false, current: 0, required: 15, unit: 'launches', messageKey: 'requirement.progress', remedyKey: 'remedy.fly_more', remedyParams: { missing: 15, unit: 'launches' } },
    { nameKey: 'requirement.training_flights', met: false, current: 0, required: 2, unit: 'flights', messageKey: 'requirement.progress', remedyKey: 'remedy.fly_more', remedyParams: { missing: 2, unit: 'flights' } },
    { nameKey: 'requirement.proficiency_check', met: false, current: 0, required: 1, unit: 'check', messageKey: 'requirement.prof_check_missing', remedyKey: 'remedy.proficiency_check' },
  ],
  launchMethodCurrency: [
    { method: 'winch', launches: 0, required: 5, met: false, message: '', messageKey: 'launch_method.progress', remedyKey: 'remedy.launch_method_dual', remedyParams: { method: 'winch', missing: 5 } },
  ],
};

const karlTmg: ClassRatingCurrency = {
  classRatingId: 'cr2', classType: 'TMG', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
  status: 'current', message: '', messageKey: 'rating.recency_current',
  requirements: [
    { nameKey: 'requirement.proficiency_check', met: false, current: 0, required: 1, unit: 'check', messageKey: 'requirement.prof_check_missing', remedyKey: 'remedy.proficiency_check' },
  ],
};

describe('SeasonStartPlanner', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('K2/L-job4: lists what restores a lapsed rating, with the proficiency check as the alternative', () => {
    mockRatings([karlGlider, karlTmg]);
    render(<SeasonStartPlanner />);
    const rating = screen.getByTestId('season-plan-rating-cr1');
    expect(rating).toHaveTextContent('Glider · SPL');
    expect(within(rating).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Launches: Fly 15 more launches',
      'Training flights with instructor: Fly 2 more flights',
    ]);
    expect(rating).toHaveTextContent('Alternatively: Take a proficiency check with an examiner');
    expect(screen.getByTestId('season-plan-launch-cr1-winch')).toHaveTextContent(
      'Fly 5 more launches dual or supervised solo (Winch)',
    );
    expect(screen.queryByTestId('season-plan-rating-cr2')).not.toBeInTheDocument();
  });

  it('L4: a current rating with a lapsed launch method lists only that method', () => {
    mockRatings([{
      ...karlGlider,
      status: 'current',
      launchMethodCurrency: [
        { method: 'aerotow', launches: 3, required: 5, met: false, message: '', remedyKey: 'remedy.launch_method_dual', remedyParams: { method: 'aerotow', missing: 2 } },
      ],
    }]);
    render(<SeasonStartPlanner />);
    expect(screen.queryByTestId('season-plan-rating-cr1')).not.toBeInTheDocument();
    expect(screen.getByTestId('season-plan-launch-cr1-aerotow')).toHaveTextContent('Fly 2 more launches dual or supervised solo (Aerotow)');
  });

  it('renders nothing when nothing is lapsed, or before currency loads', () => {
    mockRatings([karlTmg]);
    const { container, unmount } = render(<SeasonStartPlanner />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    mockRatings(undefined);
    expect(render(<SeasonStartPlanner />).container).toBeEmptyDOMElement();
  });
});
