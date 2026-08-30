import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCurrencyMessages, formatAmount } from '../../lib/currencyMessages';
import { useAuthStore } from '../../stores/authStore';
import type { CurrencyRequirement } from '../../types/api';

const req = (over: Partial<CurrencyRequirement>): CurrencyRequirement => ({
  name: 'Total Hours',
  met: true,
  current: 15,
  required: 12,
  unit: 'landings',
  message: 'raw English from the API',
  ...over,
});

describe('useCurrencyMessages', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'u1', name: 'Pilot', email: 'p@t.com' }, accessToken: 'tok' } as never);
  });

  const messages = () => renderHook(() => useCurrencyMessages()).result.current;

  describe('currencyMessage', () => {
    it('renders a known key from the catalogue instead of the API English', () => {
      const text = messages().currencyMessage({
        messageKey: 'rating.revalidation_current',
        message: 'EASA SEP_LAND current — all revalidation requirements met',
      });
      expect(text).toBe('Current — all revalidation requirements met.');
    });

    it('falls back to the deprecated message for an unrecognised key', () => {
      const text = messages().currencyMessage({
        messageKey: 'rating.some_future_key',
        message: 'EASA SEP_LAND — something new',
      });
      expect(text).toBe('EASA SEP_LAND — something new');
    });

    it('falls back to the deprecated message when no key is present', () => {
      const text = messages().currencyMessage({ message: 'EASA SEP_LAND current' });
      expect(text).toBe('EASA SEP_LAND current');
    });

    it('returns an empty string when neither key nor message is present', () => {
      expect(messages().currencyMessage(undefined)).toBe('');
      expect(messages().currencyMessage({})).toBe('');
    });

    it('interpolates a days param and picks the singular form', () => {
      expect(
        messages().currencyMessage({ messageKey: 'rating.expiring', messageParams: { days: 1 } }),
      ).toBe('Expires in 1 day.');
    });

    it('picks the plural form for more than one day', () => {
      expect(
        messages().currencyMessage({ messageKey: 'rating.expiring', messageParams: { days: 42 } }),
      ).toBe('Expires in 42 days.');
    });

    it('interpolates a needed param with the right plural', () => {
      expect(
        messages().currencyMessage({ messageKey: 'pax.not_current', messageParams: { needed: 1 } }),
      ).toContain('1 more landing in the last 90 days');
      expect(
        messages().currencyMessage({ messageKey: 'pax.not_current', messageParams: { needed: 3 } }),
      ).toContain('3 more landings in the last 90 days');
    });

    it('formats a date param with the user date preference', () => {
      const text = messages().currencyMessage({
        messageKey: 'flight_review.current',
        messageParams: { date: '2025-06-15' },
      });
      expect(text).toBe('Current — last completed 15.06.2025.');
    });

    it('composes extra values supplied from the enclosing object', () => {
      const text = messages().currencyMessage(
        { messageKey: 'launch_method.progress' },
        { current: 8, required: 5 },
      );
      expect(text).toBe('8 / 5 launches');
    });
  });

  describe('requirementName', () => {
    it('resolves a regulatory nameKey', () => {
      expect(messages().requirementName({ nameKey: 'requirement.total_time', name: 'Total Hours' }))
        .toBe('Total Time');
    });

    it('renders a custom rule name as-is when there is no nameKey', () => {
      expect(messages().requirementName({ name: 'Nachtlandungen im Verein' }))
        .toBe('Nachtlandungen im Verein');
    });

    it('falls back to the raw name for an unrecognised nameKey', () => {
      expect(messages().requirementName({ nameKey: 'requirement.future_thing', name: 'Future Thing' }))
        .toBe('Future Thing');
    });
  });

  describe('requirementProgress', () => {
    it('renders current / required with a localised unit', () => {
      expect(messages().requirementProgress(req({ messageKey: 'requirement.progress' })))
        .toBe('15 / 12 landings');
    });

    it('keeps an unknown unit verbatim', () => {
      expect(messages().requirementProgress(req({ messageKey: 'requirement.progress', unit: 'jumps' })))
        .toBe('15 / 12 jumps');
    });

    it('renders durations for minute-based requirements', () => {
      expect(messages().requirementProgress(req({ unit: 'minutes', current: 900, required: 720 })))
        .toBe('15h 0m / 12h 0m');
    });

    it('renders a proficiency check completion date', () => {
      const text = messages().requirementProgress(
        req({
          unit: 'check',
          current: 1,
          required: 1,
          messageKey: 'requirement.prof_check_completed',
          messageParams: { date: '2026-01-15' },
        }),
      );
      expect(text).toBe('Completed 15.01.2026');
    });

    it('renders a missing proficiency check', () => {
      const text = messages().requirementProgress(
        req({ unit: 'check', current: 0, required: 1, met: false, messageKey: 'requirement.prof_check_missing' }),
      );
      expect(text).toBe('Not completed');
    });

    it('falls back to the deprecated message when no key is present', () => {
      expect(messages().requirementProgress(req({}))).toBe('raw English from the API');
    });
  });
});

describe('formatAmount', () => {
  it('drops the decimal for whole numbers', () => {
    expect(formatAmount(12)).toBe('12');
  });

  it('keeps one decimal otherwise', () => {
    expect(formatAmount(12.5)).toBe('12.5');
  });
});
