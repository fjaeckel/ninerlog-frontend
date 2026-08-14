import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../../i18n';

describe('i18n setup', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('loads English as fallback language', () => {
    expect(i18n.language).toBe('en');
  });

  it('has all 13 namespaces loaded for English', () => {
    const namespaces = ['common', 'auth', 'nav', 'flights', 'aircraft', 'dashboard', 'currency', 'licenses', 'credentials', 'reports', 'settings', 'import', 'help'];
    for (const ns of namespaces) {
      expect(i18n.hasResourceBundle('en', ns)).toBe(true);
    }
  });

  it('has all 13 namespaces loaded for German', () => {
    const namespaces = ['common', 'auth', 'nav', 'flights', 'aircraft', 'dashboard', 'currency', 'licenses', 'credentials', 'reports', 'settings', 'import', 'help'];
    for (const ns of namespaces) {
      expect(i18n.hasResourceBundle('de', ns)).toBe(true);
    }
  });

  it('switches to German locale', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.language).toBe('de');
  });

  it('returns English translations by default', () => {
    expect(i18n.t('common:save')).not.toBe('common:save');
    expect(i18n.t('nav:dashboard')).not.toBe('nav:dashboard');
  });

  it('returns German translations when locale is de', async () => {
    await i18n.changeLanguage('de');
    // German "save" should differ from the key
    const result = i18n.t('common:save');
    expect(result).not.toBe('common:save');
    // Verify it's actually German (Speichern)
    expect(result).toBe('Speichern');
  });

  it('falls back to English for unknown locale', async () => {
    await i18n.changeLanguage('fr');
    const result = i18n.t('common:save');
    expect(result).not.toBe('common:save');
  });

  it('handles pluralization in English', () => {
    const one = i18n.t('flights:flightsTotal', { count: 1 });
    const many = i18n.t('flights:flightsTotal', { count: 5 });
    expect(one).not.toBe(many);
  });

  it('handles pluralization in German', async () => {
    await i18n.changeLanguage('de');
    const one = i18n.t('flights:flightsTotal', { count: 1 });
    const many = i18n.t('flights:flightsTotal', { count: 5 });
    expect(one).not.toBe(many);
  });

  it('handles import namespace pluralization', () => {
    const one = i18n.t('import:rowsDetected', { count: 1 });
    const many = i18n.t('import:rowsDetected', { count: 5 });
    expect(one).toContain('1');
    expect(many).toContain('5');
    // Singular vs plural should differ
    expect(one).not.toBe(many);
  });

  it('handles reports map.flightCount pluralization', () => {
    const one = i18n.t('reports:map.flightCount', { count: 1 });
    const many = i18n.t('reports:map.flightCount', { count: 3 });
    expect(one).toContain('1');
    expect(many).toContain('3');
    expect(one).not.toBe(many);
  });

  // The contact-deduplication surfaces. A missing German key is invisible at
  // runtime — i18next silently falls back to English — so pin both languages.
  describe('contact deduplication strings', () => {
    const keys = [
      'people:errors.duplicateName',
      'people:exportVCard',
      'people:exportFailed',
      'common:admin.dashboard.totalContacts',
      'reports:export.vcardTitle',
      'reports:export.vcardDescription',
      'import:restoreSummaryContacts',
    ];

    for (const lang of ['en', 'de'] as const) {
      it(`resolves every key in ${lang}`, async () => {
        await i18n.changeLanguage(lang);
        for (const key of keys) {
          const value = i18n.t(key, { name: 'Hans Müller' });
          expect(value, `${key} missing in ${lang}`).not.toBe(key);
          expect(value.length).toBeGreaterThan(0);
        }
      });

      it(`pluralises the rename count in ${lang}`, async () => {
        await i18n.changeLanguage(lang);
        const one = i18n.t('people:crewEntriesRenamed', { count: 1 });
        const many = i18n.t('people:crewEntriesRenamed', { count: 5 });
        expect(one).toContain('1');
        expect(many).toContain('5');
        expect(one).not.toBe(many);
      });
    }

    it('differs between English and German', async () => {
      await i18n.changeLanguage('en');
      const en = i18n.t('people:exportVCard');
      await i18n.changeLanguage('de');
      expect(i18n.t('people:exportVCard')).not.toBe(en);
    });
  });
});
