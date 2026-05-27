import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, ShieldX, Shield, Calendar, Clock } from 'lucide-react';
import type { ClassRatingCurrency, CurrencyRequirement, CurrencyStatus } from '../../types/api';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

const STATUS_CONFIG: Record<CurrencyStatus, {
  bg: string; border: string; iconWrap: string; badge: string; badgeKey: string; Icon: typeof Shield;
}> = {
  current: {
    bg: 'bg-gradient-to-br from-green-50/70 via-white to-green-50/30 dark:from-green-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-green-500',
    iconWrap: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-2 ring-green-500/15',
    badge: 'badge-current',
    badgeKey: 'status.current',
    Icon: ShieldCheck,
  },
  expiring: {
    bg: 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-amber-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-amber-500',
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-2 ring-amber-500/15',
    badge: 'badge-expiring',
    badgeKey: 'status.attention',
    Icon: ShieldAlert,
  },
  expired: {
    bg: 'bg-gradient-to-br from-red-50/70 via-white to-red-50/30 dark:from-red-900/15 dark:via-slate-800 dark:to-slate-800',
    border: 'border-l-4 border-l-red-500',
    iconWrap: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-500/15',
    badge: 'badge-expired',
    badgeKey: 'status.notCurrent',
    Icon: ShieldX,
  },
  unknown: {
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-l-4 border-l-slate-300 dark:border-l-slate-600',
    iconWrap: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
    badge: 'badge-neutral',
    badgeKey: 'status.unknown',
    Icon: Shield,
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
        <span className="font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
          <span aria-hidden="true" className={req.met ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
            {req.met ? '✓' : '○'}
          </span>
          {req.name}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          {displayMessage}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
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
  const StatusIcon = config.Icon;
  const label = t(`classTypes.${rating.classType}`, { defaultValue: rating.classType });

  return (
    <div
      className={`card hover-lift ${config.border} ${config.bg}`}
      data-testid={`currency-card-${rating.classRatingId}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg ${config.iconWrap}`}
            aria-hidden="true"
          >
            <StatusIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
              {label}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {rating.regulatoryAuthority} {rating.licenseType || ''}
            </p>
          </div>
        </div>
        <span className={`${config.badge} shrink-0`}>
          {t(config.badgeKey).toUpperCase()}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
        {rating.message}
      </p>

      {/* Window-not-yet-open banner — shown for EASA FCL.740.A / FCL.625.A
          ratings during the first ~12 months after revalidation, when flight
          experience does not yet count toward the next revalidation. */}
      {rating.windowOpensAt && rating.windowOpen === false && (
        <div
          className="mb-3 rounded-md border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-800 dark:border-sky-800/50 dark:bg-sky-900/20 dark:text-sky-200 inline-flex items-start gap-2 w-full"
          data-testid="currency-window-closed"
        >
          <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-medium">
              {t('windowOpensLabel', { date: fmtDate(rating.windowOpensAt) })}
            </p>
            <p className="text-sky-700/80 dark:text-sky-300/80">
              {t('windowClosedHint')}
            </p>
          </div>
        </div>
      )}

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
              <span className="text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
                <span aria-hidden="true" className={lmc.met ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                  {lmc.met ? '✓' : '○'}
                </span>
                {lmc.method}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {t('launchesCount', { current: lmc.launches, required: lmc.required })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expiry date */}
      {rating.expiryDate && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-right inline-flex items-center gap-1 justify-end w-full">
          <Calendar className="w-3 h-3" aria-hidden="true" />
          {t('expiresLabel', { date: fmtDate(rating.expiryDate) })}
        </p>
      )}
    </div>
  );
}
