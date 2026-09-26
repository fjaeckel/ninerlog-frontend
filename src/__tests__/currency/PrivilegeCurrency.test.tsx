import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CurrencyPage from '../../pages/currency/CurrencyPage';
import * as useCurrencyHook from '../../hooks/useCurrency';
import * as useCustomCurrencyHook from '../../hooks/useCustomCurrency';
import * as useCredentialsHook from '../../hooks/useCredentials';
import * as useLicensesHook from '../../hooks/useLicenses';
import { useAuthStore } from '../../stores/authStore';
import type { CurrencyStatusResponse } from '../../types/api';

const renderPage = (data: Partial<CurrencyStatusResponse>, licenses: object[]) => {
  vi.spyOn(useCurrencyHook, 'useAllCurrencyStatus').mockReturnValue({
    data: { ratings: [], passengerCurrency: [], ...data }, isLoading: false, error: null,
  } as never);
  vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({ data: licenses, isLoading: false, error: null } as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><CurrencyPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

const PETRA_LICENCES = [
  { id: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL', licenseNumber: 'DE.SFCL.03318' },
  { id: 'l2', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)', licenseNumber: 'DE.FCL.PPL.A.22109' },
  { id: 'l3', regulatoryAuthority: 'EASA', licenseType: 'FI(S)', licenseNumber: 'DE.SFCL.FI.0412' },
];

const petra: Partial<CurrencyStatusResponse> = {
  ratings: [{
    classRatingId: 'cr1', classType: 'GLIDER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
    status: 'current', message: '', messageKey: 'rating.recency_current', requirements: [],
    launchMethodCurrency: [
      { method: 'self-launch', launches: 29, required: 5, met: true, message: '', messageKey: 'launch_method.progress', trained: true },
      { method: 'winch', launches: 61, required: 5, met: true, message: '', messageKey: 'launch_method.progress', trained: false },
    ],
  }],
  privileges: [
    {
      privilegeId: 'pv2', licenseId: 'l1', kind: 'CLOUD_FLYING', status: 'current',
      messageKey: 'privilege.recency_current', ruleDescriptionKey: 'sfcl_215_cloud_flying',
      requirements: [
        { nameKey: 'requirement.cloud_flying_time', met: true, current: 72, required: 60, unit: 'minutes', messageKey: 'requirement.progress', validUntil: '2028-05-02' },
        { nameKey: 'requirement.cloud_flying_flights', met: false, current: 4, required: 5, unit: 'flights', messageKey: 'requirement.progress', remedyKey: 'remedy.privilege_with_instructor', remedyParams: { missing: 1, unit: 'flights' } },
      ],
    },
    {
      privilegeId: 'pv1', licenseId: 'l2', kind: 'SAILPLANE_TOWING', status: 'current',
      messageKey: 'privilege.recency_current', ruleDescriptionKey: 'sfcl_205_towing',
      requirements: [
        { nameKey: 'requirement.tows', met: true, current: 71, required: 5, unit: 'tows', messageKey: 'requirement.progress', validUntil: '2028-08-14' },
      ],
    },
    {
      privilegeId: 'pv3', licenseId: 'l3', kind: 'FI_S', status: 'lapsed',
      messageKey: 'privilege.recency_not_met', ruleDescriptionKey: 'sfcl_360_fi_s',
      requirements: [
        { nameKey: 'requirement.instruction_time', met: false, current: 517, required: 1800, unit: 'minutes', messageKey: 'requirement.progress', remedyKey: 'remedy.fly_more', remedyParams: { missing: 1283, unit: 'minutes' } },
        { nameKey: 'requirement.instruction_launches', met: false, current: 40, required: 60, unit: 'launches', messageKey: 'requirement.progress', remedyKey: 'remedy.fly_more', remedyParams: { missing: 20, unit: 'launches' } },
        { nameKey: 'requirement.fi_refresher', met: false, current: 0, required: 1, unit: 'training', messageKey: 'requirement.untracked' },
      ],
    },
  ],
};

describe('CurrencyPage — licence privileges', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { id: 'u1', name: 'Pilot', email: 'p@t.com' }, accessToken: 'tok' } as never);
    vi.spyOn(useCustomCurrencyHook, 'useCustomCurrencies').mockReturnValue({ data: [], isLoading: false, error: null } as never);
    vi.spyOn(useCredentialsHook, 'useCredentials').mockReturnValue({ data: [], isLoading: false, error: null } as never);
  });

  it('P job 3: Petra sees towing current next to her licences, with tows and validity', () => {
    renderPage(petra, PETRA_LICENCES);
    const card = screen.getByTestId('privilege-currency-pv1');
    expect(within(card).getByText('Sailplane towing')).toBeInTheDocument();
    expect(within(card).getByText('CURRENT')).toBeInTheDocument();
    expect(within(card).getByText('Current — recency requirement met.')).toBeInTheDocument();
    expect(within(card).getByText('Tows as tug pilot')).toBeInTheDocument();
    expect(within(card).getByText('71 / 5 tows')).toBeInTheDocument();
    expect(within(card).getByTestId('requirement-requirement.tows-valid-until')).toHaveTextContent('valid until 14.08.2028');
    expect(screen.getByText(/Requires 5 tows within the last 24 months/)).toBeInTheDocument();
  });

  it('P job 3: cloud flying is current from IFR time; the unused alternative shows no remedy', () => {
    renderPage(petra, PETRA_LICENCES);
    const card = screen.getByTestId('privilege-currency-pv2');
    expect(within(card).getByText('Cloud flying')).toBeInTheDocument();
    expect(within(card).getByText('Cloud flying time (IFR, PIC)')).toBeInTheDocument();
    expect(within(card).getByText('1h 12m / 1h 0m')).toBeInTheDocument();
    expect(within(card).queryByTestId('requirement-requirement.cloud_flying_flights-remedy')).toBeNull();
  });

  it('a licence with privileges only gets its own group; a lapsed FI(S) shows remedies and the untracked refresher', () => {
    renderPage(petra, PETRA_LICENCES);
    expect(screen.getByText('EASA FI(S)')).toBeInTheDocument();
    expect(screen.getAllByText('1 privilege')).toHaveLength(2);
    const card = screen.getByTestId('privilege-currency-pv3');
    expect(within(card).getByText('NOT CURRENT')).toBeInTheDocument();
    expect(within(card).getByTestId('requirement-requirement.instruction_launches-remedy')).toHaveTextContent('Fly 20 more launches');
    expect(within(card).getByTestId('requirement-requirement.fi_refresher-untracked')).toHaveTextContent('Not tracked — confirm it yourself');
    expect(within(card).queryByTestId('requirement-requirement.fi_refresher-remedy')).toBeNull();
  });

  it('renders the privilege-with-instructor remedy on a lapsed SFCL.205 row', () => {
    renderPage({
      privileges: [{
        privilegeId: 'pv1', licenseId: 'l2', kind: 'SAILPLANE_TOWING', status: 'lapsed', messageKey: 'privilege.recency_not_met',
        requirements: [{ nameKey: 'requirement.tows', met: false, current: 2, required: 5, unit: 'tows', messageKey: 'requirement.progress', remedyKey: 'remedy.privilege_with_instructor', remedyParams: { missing: 3, unit: 'tows' } }],
      }],
    }, PETRA_LICENCES);
    expect(screen.getByTestId('requirement-requirement.tows-remedy'))
      .toHaveTextContent('Fly 3 more tows with or under the supervision of an instructor');
  });

  it('L4: trained launch methods carry a chip; a logged untrained method gets a hint', () => {
    renderPage(petra, PETRA_LICENCES);
    expect(screen.getByTestId('launch-method-self-launch-trained')).toHaveTextContent('trained');
    expect(screen.queryByTestId('launch-method-winch-trained')).toBeNull();
    expect(screen.getByTestId('launch-method-winch-untrained')).toHaveTextContent('no training in this launch method');
  });

  it('shows no untrained hint when the pilot has recorded no trained method', () => {
    renderPage({
      ratings: [{
        classRatingId: 'cr1', classType: 'GLIDER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
        status: 'current', message: '', messageKey: 'rating.recency_current', requirements: [],
        launchMethodCurrency: [{ method: 'winch', launches: 61, required: 5, met: true, message: '', messageKey: 'launch_method.progress', trained: false }],
      }],
    }, PETRA_LICENCES);
    expect(screen.queryByTestId('launch-method-winch-untrained')).toBeNull();
  });

  it('M job 1: Mehmet without an authorisation is prompted to record it, with §84a progress', () => {
    renderPage({
      ratings: [{
        classRatingId: 'cr1', classType: 'ULTRALIGHT', licenseId: 'l1', regulatoryAuthority: 'DULV', licenseType: 'UL',
        status: 'current', message: '', messageKey: 'rating.recency_current', requirements: [],
      }],
      passengerCurrency: [{
        classType: 'ULTRALIGHT', ulKind: 'THREE_AXIS', regulatoryAuthority: 'DULV', dayStatus: 'unknown', nightStatus: 'unknown',
        dayLandings: 12, nightLandings: 0, dayRequired: 3, nightRequired: 0, nightPrivilege: false, dayExpiresOn: '2026-10-30',
        message: '', messageKey: 'pax.ul_authorisation_missing', ruleDescription: '', ruleDescriptionKey: 'ul_pax',
        requirements: [
          { nameKey: 'requirement.ul_xc_flights', met: true, current: 5, required: 5, unit: 'flights', messageKey: 'requirement.progress' },
          { nameKey: 'requirement.ul_xc_landing_flights', met: false, current: 1, required: 2, unit: 'flights', messageKey: 'requirement.progress', remedyKey: 'remedy.fly_more', remedyParams: { missing: 1, unit: 'flights' } },
          { nameKey: 'requirement.ul_xc_distance', met: false, current: 143, required: 200, unit: 'km', messageKey: 'requirement.progress', remedyKey: 'remedy.fly_more', remedyParams: { missing: 57, unit: 'km' } },
        ],
      }],
    }, [{ id: 'l1', regulatoryAuthority: 'DULV', licenseType: 'UL', licenseNumber: 'DULV-UL-4711' }]);
    const card = screen.getByTestId('passenger-currency-ULTRALIGHT');
    expect(within(card).getByText('Authorisation missing')).toBeInTheDocument();
    expect(within(card).getByTestId('pax-ul-authorisation-missing')).toHaveTextContent('no passenger authorisation (LuftPersV §84a)');
    expect(within(card).getByTestId('pax-add-ul-authorisation'))
      .toHaveAttribute('href', '/licenses?addPrivilege=UL_PASSENGER_AUTH&licence=l1');
    expect(within(card).getByText('Toward the passenger authorisation (LuftPersV §84a)')).toBeInTheDocument();
    expect(within(card).getByText('143 / 200 km')).toBeInTheDocument();
    expect(within(card).getByTestId('requirement-requirement.ul_xc_distance-remedy')).toHaveTextContent('Fly 57 more km');
  });

  it('M job 1: with the authorisation recorded, the entry is current and shows no prompt', () => {
    renderPage({
      passengerCurrency: [{
        classType: 'ULTRALIGHT', ulKind: 'THREE_AXIS', regulatoryAuthority: 'DULV', dayStatus: 'current', nightStatus: 'unknown',
        dayLandings: 12, nightLandings: 0, dayRequired: 3, nightRequired: 0, nightPrivilege: false,
        message: '', messageKey: 'pax.current_day_no_night_privilege', ruleDescription: '', ruleDescriptionKey: 'ul_pax',
      }],
    }, []);
    const card = screen.getByTestId('passenger-currency-ULTRALIGHT');
    expect(within(card).getByText('Current')).toBeInTheDocument();
    expect(within(card).queryByTestId('pax-ul-authorisation-missing')).toBeNull();
  });

  it('L4: SPL passenger entries show the SFCL.115(a)(2) prerequisites without remedies once one alternative is met', () => {
    renderPage({
      passengerCurrency: [{
        classType: 'GLIDER', regulatoryAuthority: 'EASA', dayStatus: 'current', nightStatus: 'unknown',
        dayLandings: 42, nightLandings: 0, dayRequired: 3, nightRequired: 0, nightPrivilege: false,
        message: '', messageKey: 'pax.current_day_no_night_privilege', ruleDescription: '', ruleDescriptionKey: 'easa_spl_pax',
        requirements: [
          { nameKey: 'requirement.pax_prerequisite_time', met: false, current: 300, required: 600, unit: 'minutes', messageKey: 'requirement.progress', remedyKey: 'remedy.fly_more', remedyParams: { missing: 300, unit: 'minutes' } },
          { nameKey: 'requirement.pax_prerequisite_launches', met: true, current: 35, required: 30, unit: 'launches', messageKey: 'requirement.progress' },
          { nameKey: 'requirement.pax_competence_flight', met: false, current: 0, required: 1, unit: 'flight', messageKey: 'requirement.untracked' },
        ],
      }],
    }, []);
    const section = screen.getByTestId('pax-requirements');
    expect(within(section).getByText('Prerequisites since licence issue (SFCL.115(a)(2))')).toBeInTheDocument();
    expect(within(section).getByText('PIC launches since licence issue')).toBeInTheDocument();
    expect(within(section).queryByTestId('requirement-requirement.pax_prerequisite_time-remedy')).toBeNull();
    expect(within(section).getByTestId('requirement-requirement.pax_competence_flight-untracked')).toBeInTheDocument();
  });

  it('A2: a pilot without privileges sees no privilege section', () => {
    renderPage({
      ratings: [{
        classRatingId: 'cr1', classType: 'SEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'ATPL(A)',
        status: 'current', message: '', messageKey: 'rating.revalidation_current', requirements: [],
      }],
    }, [{ id: 'l1', regulatoryAuthority: 'EASA', licenseType: 'ATPL(A)', licenseNumber: 'X' }]);
    expect(screen.queryByText('Privileges')).toBeNull();
    expect(screen.getByText('1 rating')).toBeInTheDocument();
  });
});
