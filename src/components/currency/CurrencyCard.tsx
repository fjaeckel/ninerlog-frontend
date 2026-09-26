import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Calendar, Clock, Layers, AlertTriangle, ArrowRight, CornerDownRight, GraduationCap, Info } from 'lucide-react';
import type { ClassRatingCurrency, ClassType, CurrencyRemedy, CurrencyRequirement } from '../../types/api';
import { STATUS_CONFIG } from './statusConfig';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useCurrencyMessages } from '../../lib/currencyMessages';
import { ratingStatus } from '../../lib/ratingStatus';
import { RequirementIcon } from '../ui/RequirementIcon';

/** Validity of a met row, or what restores an unmet one. */
function RowFootnote({ met, validUntil, remedy, showRemedy, testId }: {
  met: boolean;
  validUntil?: string | null;
  remedy: CurrencyRemedy;
  showRemedy: boolean;
  testId: string;
}) {
  const { t } = useTranslation('currency');
  const messages = useCurrencyMessages();
  if (met && validUntil) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 text-right tabular-nums" data-testid={`${testId}-valid-until`}>
        {messages.validUntil(validUntil)}
      </p>
    );
  }
  if (!met && showRemedy && remedy.remedyKey) {
    return (
      <p
        className="text-xs text-amber-800 dark:text-amber-300 inline-flex items-start gap-1.5"
        data-testid={`${testId}-remedy`}
      >
        <CornerDownRight className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
        <span>
          <span className="sr-only">{t('remedyLabel')}: </span>
          {messages.remedy(remedy)}
        </span>
      </p>
    );
  }
  return null;
}

export function RequirementBar({ req, showRemedy }: { req: CurrencyRequirement; showRemedy: boolean }) {
  const { requirementName, requirementProgress, currencyMessage } = useCurrencyMessages();
  const pct = req.required > 0 ? Math.min((req.current / req.required) * 100, 100) : 0;
  const barColor = req.met
    ? 'bg-green-500 dark:bg-green-400'
    : pct >= 50
      ? 'bg-amber-500 dark:bg-amber-400'
      : 'bg-red-500 dark:bg-red-400';

  const id = req.nameKey ?? req.name;

  if (req.messageKey === 'requirement.untracked') {
    return (
      <div className="flex justify-between items-start gap-2 text-xs" data-testid={`requirement-${id}`}>
        <span className="font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          {requirementName(req)}
        </span>
        <span className="text-slate-500 dark:text-slate-400 italic text-right" data-testid={`requirement-${id}-untracked`}>
          {currencyMessage(req)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1" data-testid={`requirement-${id}`}>
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
          <RequirementIcon met={req.met} />
          {requirementName(req)}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          {requirementProgress(req)}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
          data-testid={`progress-bar-${id}`}
        />
      </div>
      <RowFootnote met={req.met} validUntil={req.validUntil} remedy={req} showRemedy={showRemedy} testId={`requirement-${id}`} />
    </div>
  );
}

const AEROPLANE_AND_TMG_CLASSES: ClassType[] = ['SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA', 'SET_LAND', 'SET_SEA', 'TMG'];

interface CurrencyCardProps {
  rating: ClassRatingCurrency;
}

export function CurrencyCard({ rating }: CurrencyCardProps) {
  const { t } = useTranslation('currency');
  const { fmtDate } = useFormatPrefs();
  const { currencyMessage, launchMethod } = useCurrencyMessages();
  const status = ratingStatus(rating.status);
  const showRemedies = status !== 'current';
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.Icon;
  const label = t(`classTypes.${rating.classType}`, { defaultValue: rating.classType });
  const counted = rating.countedClasses ?? [];
  const creditedUL = rating.creditedUltralightKinds ?? [];
  const ownClasses = counted.length > 0 || rating.classType === 'ULTRALIGHT' || creditedUL.length === 0
    ? counted
    : [rating.classType];
  const countedParts = [
    ...(ownClasses.length > 0 && AEROPLANE_AND_TMG_CLASSES.every((ct) => ownClasses.includes(ct))
      ? [t('countedClassesAeroplanes')]
      : ownClasses.map((ct) => t(`classTypes.${ct}`, { defaultValue: ct }))),
    ...creditedUL.map((k) => t(`common:ulKinds.${k}`)),
  ];
  const countedText = countedParts.join(' + ');
  const showCounted = counted.length > 1 || creditedUL.length > 0;
  const anyTrained = (rating.launchMethodCurrency ?? []).some((m) => m.trained);

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

      {/* Status helper */}
      {config.helperKey && (
        <p
          className="-mt-1 mb-2 text-xs font-medium text-red-700 dark:text-red-300"
          data-testid="currency-status-helper"
        >
          {t(config.helperKey)}
        </p>
      )}

      {/* Message */}
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
        {currencyMessage(rating) || t('messageUnrecognised')}
      </p>

      {/* Missing ultralight kind on the rating */}
      {rating.messageKey === 'rating.ul_kind_required' && (
        <Link
          to={`/licenses?editRating=${encodeURIComponent(rating.classRatingId)}`}
          className="btn-secondary btn-sm mb-3"
          data-testid="currency-set-ul-kind"
        >
          {t('setUlKind')}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      )}

      {/* ULTRALIGHT flights with no kind that were not counted */}
      {rating.unclassifiedFlights != null && rating.unclassifiedFlights > 0 && (
        <div
          className="mb-3 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200 flex items-start gap-2"
          data-testid="currency-unclassified-flights"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <p>{t('unclassifiedFlights', { count: rating.unclassifiedFlights })}</p>
            <Link to="/aircraft" className="link">
              {t('unclassifiedFlightsLink')}
            </Link>
          </div>
        </div>
      )}

      {/* Aircraft classes pooled toward this rating */}
      {showCounted && (
        <p
          className="-mt-2 mb-3 text-xs text-slate-500 dark:text-slate-400 inline-flex items-start gap-1.5"
          data-testid="currency-counted-classes"
        >
          <Layers className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
          {t('countedClassesLabel', { classes: countedText })}
        </p>
      )}

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
            <RequirementBar key={req.nameKey ?? req.name} req={req} showRemedy={showRemedies} />
          ))}
        </div>
      )}

      {/* Launch method currency (SFCL.155(c)) */}
      {rating.launchMethodCurrency && rating.launchMethodCurrency.length > 0 && (
        <div className="mt-3 space-y-1" data-testid="launch-method-currency">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('launchMethod')}</p>
          {rating.launchMethodCurrency.map((lmc) => (
            <div key={lmc.method} className="space-y-0.5" data-testid={`launch-method-${lmc.method}`}>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 flex-wrap">
                  <RequirementIcon met={lmc.met} />
                  {launchMethod(lmc.method)}
                  {lmc.trained && (
                    <span
                      className="badge-info gap-1 py-0"
                      data-testid={`launch-method-${lmc.method}-trained`}
                    >
                      <GraduationCap className="w-3 h-3" aria-hidden="true" />
                      {t('launchMethodTrained')}
                    </span>
                  )}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {currencyMessage(lmc, { current: lmc.launches, required: lmc.required })}
                </span>
              </div>
              <RowFootnote met={lmc.met} validUntil={lmc.validUntil} remedy={lmc} showRemedy testId={`launch-method-${lmc.method}`} />
              {anyTrained && lmc.trained === false && lmc.launches > 0 && (
                <p
                  className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-start gap-1.5"
                  data-testid={`launch-method-${lmc.method}-untrained`}
                >
                  <Info className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
                  {t('launchMethodUntrainedHint')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rolling recency: last day current without flying again */}
      {rating.validUntil && status === 'current' && (
        <p
          className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-right inline-flex items-center gap-1 justify-end w-full"
          data-testid="currency-valid-until"
        >
          <Calendar className="w-3 h-3" aria-hidden="true" />
          {t('ratingValidUntil', { date: fmtDate(rating.validUntil) })}
        </p>
      )}

      {/* Expiry date */}
      {rating.expiryDate && status !== 'lapsed' && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-right inline-flex items-center gap-1 justify-end w-full">
          <Calendar className="w-3 h-3" aria-hidden="true" />
          {t('expiresLabel', { date: fmtDate(rating.expiryDate) })}
        </p>
      )}
    </div>
  );
}
