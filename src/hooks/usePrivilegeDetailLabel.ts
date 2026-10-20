import { useTranslation } from 'react-i18next';
import { launchMethodKey } from '../lib/currencyMessages';
import { privilegeDetailKind, type LicencePrivilegeKind } from '../lib/privileges';

/** Localised detail of a privilege: launch method, UL kind, or the stored text. */
export function usePrivilegeDetailLabel() {
  const { t } = useTranslation(['licenses', 'common', 'flights']);
  return (kind: LicencePrivilegeKind, detail?: string | null): string => {
    if (!detail) return '';
    switch (privilegeDetailKind(kind)) {
      case 'launchMethod':
        return t(launchMethodKey(detail), { ns: 'flights', defaultValue: detail });
      case 'ulKind':
        return t(`common:ulKinds.${detail}`, { defaultValue: detail });
      default:
        return detail;
    }
  };
}
