import { useTranslation } from 'react-i18next';
import type { ClassRatingCurrency, CurrencyRequirement, CurrencyStatus } from '../../types/api';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

const STATUS_CONFIG: Record<CurrencyStatus, {
  bg: string; border: string; badge: string; badgeKey: string; icon: string;
}> = {
  current: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-l-green-500',
    badge: 'badge-current',
    badgeKey: 'status.current',
    icon: '✓',
  },
  expiring: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-l-amber-500',
    badge: 'badge-expiring',
    badgeKey: 'status.attention',
    icon: '⏰',
  },
  expired: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-l-red-500',
    badge: 'badge-expired',
    badgeKey: 'status.notCurrent',
    icon: '✕',
  },
  unknown: {
    bg: 'bg-slate-50 dark:bg-slate-800/40',
    border: 'border-l-slate-400',
    badge: 'badge-neutral',
    badgeKey: 'status.unknown',
    icon: '?',
  },
};

function RequirementBar({ req }: { req: CurrencyRequirement }) {
  const { fmtDuration } = useFormatPrefs();
  const pct = req.required > 0 ? Math.min((req.current / req.required) * 100, 100) : 0;
  const barColor = req.met
    ? 'bg-green-500 dark:bg-green-400'
    : pct >= 50
      ? 'bg-amber-500 dark:bg-amber-400'
      : 'bg-red-500 dark:bg-red-400';

  const displayMessage = req.unit === 'minutes'
    ? `${fmtDuration(req.current)} / ${fmtDuration(req.required)}`
    : req.message;

  return (
    <div className="space-y-1" data-testid={`requirement-${req.name}`}>
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {req.met ? '✓' : '○'} {req.name}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {displayMessage}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
          data-testid={`progress-bar-${req.name}`}
        />
      </div>
    </div>
  );
}

interface CurrencyCardProps {
  rating: ClassRatingCurrency;
}

export function CurrencyCard({ rating }: CurrencyCardProps) {
  const { t } = useTranslation('currency');
  const { fmtDate } = useFormatPrefs();
  const config = STATUS_CONFIG[rating.status];
  const label = t(`classTypes.${rating.classType}`, { defaultValue: rating.classType });

  return (
    <div
      className={`card border-l-4 ${config.border} ${config.bg}`}
      data-testid={`currency-card-${rating.classRatingId}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>{config.icon}</span>
            {label}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {rating.regulatoryAuthority} {rating.licenseType || ''}
          </p>
        </div>
        <span className={`${config.badge}`}>
          {t(config.badgeKey).toUpperCase()}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
        {rating.message}
      </p>

      {/* Requirements with progress bars */}
      {rating.requirements && rating.requirements.length > 0 && (
        <div className="space-y-2">
          {rating.requirements.map((req) => (
            <RequirementBar key={req.name} req={req} />
          ))}
        </div>
      )}

      {/* Launch method currency (SPL FCL.140.S(b)(1)) */}
      {rating.launchMethodCurrency && rating.launchMethodCurrency.length > 0 && (
        <div className="mt-3 space-y-1" data-testid="launch-method-currency">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('launchMethod')}</p>
          {rating.launchMethodCurrency.map((lmc) => (
            <div key={lmc.method} className="flex justify-between items-center text-xs" data-testid={`launch-method-${lmc.method}`}>
              <span className="text-slate-700 dark:text-slate-300">
                {lmc.met ? '✓' : '○'} {lmc.method}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {t('launchesCount', { current: lmc.launches, required: lmc.required })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expiry date */}
      {rating.expiryDate && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-right">
          {t('expiresLabel', { date: fmtDate(rating.expiryDate) })}
        </p>
      )}
    </div>
  );
}
