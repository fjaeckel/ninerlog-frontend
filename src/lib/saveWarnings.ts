import type { TFunction } from 'i18next';
import type { SaveWarning } from '../stores/saveWarningsStore';

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/** Localised message of a save warning. */
export function saveWarningMessage(t: TFunction, w: SaveWarning): string {
  const p = w.params ?? {};
  switch (w.code) {
    case 'ul_night_flight': {
      const registration = str(p.registration);
      return registration
        ? t('common:saveWarnings.ul_night_flight_reg', { registration })
        : t('common:saveWarnings.ul_night_flight');
    }
    case 'ul_mtom_exceeds_600':
      return t('common:saveWarnings.ul_mtom_exceeds_600', { mtomKg: str(p.mtomKg), limitKg: str(p.limitKg) || '600' });
    case 'ul_120kg_class':
      return t('common:saveWarnings.ul_120kg_class', { mtomKg: str(p.mtomKg), limitKg: str(p.limitKg) || '120' });
    default:
      return t('common:saveWarnings.unknown', { code: str(w.code) });
  }
}
