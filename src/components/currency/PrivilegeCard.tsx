import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import type { PrivilegeCurrency } from '../../types/api';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useCurrencyMessages } from '../../lib/currencyMessages';
import { ratingStatus } from '../../lib/ratingStatus';
import { usePrivilegeDetailLabel } from '../../hooks/usePrivilegeDetailLabel';
import { RequirementBar } from './CurrencyCard';
import { STATUS_CONFIG } from './statusConfig';

interface PrivilegeCardProps {
  privilege: PrivilegeCurrency;
}

/** Currency of one licence privilege: status, message, recency rows and expiry. */
export function PrivilegeCard({ privilege }: PrivilegeCardProps) {
  const { t } = useTranslation('currency');
  const { fmtDate } = useFormatPrefs();
  const { currencyMessage } = useCurrencyMessages();
  const detailLabel = usePrivilegeDetailLabel();
  const status = ratingStatus(privilege.status);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.Icon;
  const expiresOn = privilege.messageParams?.date;
  const detail = detailLabel(privilege.kind, privilege.detail);

  return (
    <div
      className={`card hover-lift ${config.border} ${config.bg}`}
      data-testid={`privilege-currency-${privilege.privilegeId}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg ${config.iconWrap}`}
            aria-hidden="true"
          >
            <StatusIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {t(`common:privilegeKinds.${privilege.kind}`, { defaultValue: privilege.kind })}
            </h3>
            {detail && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{detail}</p>}
          </div>
        </div>
        <span className={`${config.badge} shrink-0`}>{t(config.badgeKey).toUpperCase()}</span>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
        {currencyMessage({ messageKey: privilege.messageKey }) || t('messageUnrecognised')}
      </p>

      {privilege.requirements && privilege.requirements.length > 0 && (
        <div className="space-y-2">
          {privilege.requirements.map((req) => (
            <RequirementBar key={req.nameKey ?? req.name} req={req} showRemedy={status !== 'current'} />
          ))}
        </div>
      )}

      {expiresOn && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-right inline-flex items-center gap-1 justify-end w-full">
          <Calendar className="w-3 h-3" aria-hidden="true" />
          {t('expiresLabel', { date: fmtDate(expiresOn) })}
        </p>
      )}
    </div>
  );
}
