import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { LOGBOOK_TERM_KEYS, isLogbookTerm } from '../../i18n/logbookTerms';
import { useAuthStore } from '../../stores/authStore';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import type { User } from '../../types/api';

const mutateAsync = vi.fn();
vi.mock('../../hooks/useProfile', () => ({
  useUpdateProfile: () => ({ mutateAsync, isPending: false }),
}));

const baseUser: User = {
  id: 'u1',
  email: 'pilot@example.com',
  name: 'Pilot',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function signIn(logbookTerms?: User['logbookTerms']) {
  useAuthStore.getState().setAuth({ ...baseUser, logbookTerms }, 'access', 'refresh', 900);
}

describe('logbook terms', () => {
  beforeEach(async () => {
    mutateAsync.mockReset();
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    act(() => useAuthStore.getState().clearAuth());
    await i18n.changeLanguage('en');
  });

  it('localizes terms by default', () => {
    signIn();
    expect(i18n.t('flights:tableDual')).toBe(i18n.getFixedT('de', 'flights')('tableDual'));
    expect(i18n.t('flights:crewRoles.Instructor')).toBe('Fluglehrer');
  });

  it('renders terms in English when the preference is english', () => {
    signIn('english');
    expect(i18n.t('flights:fields.dualTime')).toBe('Dual Received');
    expect(i18n.t('flights:crewRoles.Instructor')).toBe('Instructor');
    expect(i18n.t('dashboard:breakdownLabels.dual')).toBe('Dual');
    expect(i18n.t('settings:baseline.fields.dualHours')).toBe('Dual received');
  });

  it('works with a namespace and keyPrefix from useTranslation', () => {
    signIn('english');
    expect(i18n.getFixedT(null, 'flights')('fields.picTime')).toBe('PIC Time');
    expect(i18n.getFixedT(null, 'flights', 'crewRoles')('Examiner')).toBe('Examiner');
  });

  it('leaves everything else in the interface language', () => {
    signIn('english');
    expect(i18n.t('flights:addFlight')).toBe('Flug hinzufügen');
    expect(i18n.t('settings:language.title')).not.toBe('Language');
  });

  it('every listed term resolves to an English string', () => {
    for (const entry of LOGBOOK_TERM_KEYS) {
      const [ns, key] = entry.split(':');
      if (key.endsWith('*')) {
        const prefix = key.slice(0, -1);
        const bundle = i18n.getResourceBundle('en', ns) as Record<string, unknown>;
        const root = prefix.endsWith('.') ? prefix.slice(0, -1) : '';
        const group = root
          .split('.')
          .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle);
        const matches = root
          ? Object.keys((group ?? {}) as Record<string, unknown>)
          : Object.keys(bundle).filter((k) => k.startsWith(prefix));
        expect(matches.length, entry).toBeGreaterThan(0);
      } else {
        expect(i18n.exists(key, { ns, lng: 'en' }), entry).toBe(true);
      }
    }
  });

  it('matches exact keys and prefixes only', () => {
    expect(isLogbookTerm('flights', 'tablePic')).toBe(true);
    expect(isLogbookTerm('flights', 'fields.dualTime')).toBe(true);
    expect(isLogbookTerm('flights', 'detail.edit')).toBe(false);
    expect(isLogbookTerm('dashboard', 'stats.totalFlights')).toBe(false);
  });

  it('re-renders mounted components when the preference changes', () => {
    signIn();
    function Probe() {
      const { t } = useTranslation('flights');
      return <span>{t('crewRoles.Instructor')}</span>;
    }
    render(<Probe />);
    expect(screen.getByText('Fluglehrer')).toBeInTheDocument();
    act(() => useAuthStore.getState().updateUser({ logbookTerms: 'english' }));
    expect(screen.getByText('Instructor')).toBeInTheDocument();
  });

  it('settings toggle stores the preference', async () => {
    signIn();
    mutateAsync.mockResolvedValue({});
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByTestId('logbook-terms-english-toggle'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ logbookTerms: 'english' }));
    await waitFor(() => expect(useAuthStore.getState().user?.logbookTerms).toBe('english'));
  });

  it('settings toggle is not offered in an English interface', async () => {
    signIn();
    await act(() => i18n.changeLanguage('en'));
    render(<LanguageSwitcher />);
    expect(screen.queryByTestId('logbook-terms-english-toggle')).not.toBeInTheDocument();
  });
});
