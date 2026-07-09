import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import type { ClassRatingCurrency, FlightReviewStatus } from '../../types/api';

/**
 * Buckets each rating's revalidation/renewal rule into the handful of
 * "next step" archetypes a pilot actually needs to act on. The precise
 * legal text (hours, landings, exact CFR/FCL citation) is already shown
 * on the rating's own card below — this banner only needs to point at
 * the right kind of action.
 */
type NextStepCategory =
  | 'training_flight'
  | 'proficiency_check'
  | 'flight_review'
  | 'generic';

const RULE_KEY_CATEGORY: Record<string, NextStepCategory> = {
  easa_sep_tmg: 'training_flight',
  easa_mep_set: 'training_flight',
  easa_ir: 'proficiency_check',
  easa_lapl: 'training_flight',
  easa_spl: 'training_flight',
  easa_spl_tmg: 'training_flight',
  faa_ir: 'proficiency_check',
  faa_flight_review: 'flight_review',
  ul_luftpersv: 'training_flight',
};

interface UrgentItem {
  id: string;
  label: string;
  sublabel?: string;
  isExpired: boolean;
  days: number | null;
  category: NextStepCategory;
}

interface CurrencyExpiryBannerProps {
  ratings: ClassRatingCurrency[];
  flightReview?: FlightReviewStatus;
}

const VISIBLE_LIMIT = 3;

export function CurrencyExpiryBanner({ ratings, flightReview }: CurrencyExpiryBannerProps) {
  const { t } = useTranslation('currency');
  const [expanded, setExpanded] = useState(false);

  const now = new Date();
  const items: UrgentItem[] = [];

  for (const r of ratings) {
    if (r.status !== 'expiring' && r.status !== 'expired') continue;
    items.push({
      id: `rating-${r.classRatingId}`,
      label: t(`classTypes.${r.classType}`, { defaultValue: r.classType }),
      sublabel: r.regulatoryAuthority,
      isExpired: r.status === 'expired',
      days: r.expiryDate ? differenceInDays(new Date(r.expiryDate), now) : null,
      category: RULE_KEY_CATEGORY[r.ruleDescriptionKey ?? ''] ?? 'generic',
    });
  }

  if (flightReview && (flightReview.status === 'expiring' || flightReview.status === 'expired')) {
    items.push({
      id: 'flight-review',
      label: t('flightReview'),
      isExpired: flightReview.status === 'expired',
      days: flightReview.expiresOn ? differenceInDays(new Date(flightReview.expiresOn), now) : null,
      category: 'flight_review',
    });
  }

  if (items.length === 0) return null;

  // Expired items first, then soonest-to-expire; items without a known date sort last within their group.
  items.sort((a, b) => {
    if (a.isExpired !== b.isExpired) return a.isExpired ? -1 : 1;
    if (a.days === null) return 1;
    if (b.days === null) return -1;
    return a.days - b.days;
  });

  const hasExpired = items.some((i) => i.isExpired);
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  const palette = hasExpired
    ? {
        wrap: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        heading: 'text-red-900 dark:text-red-200',
        days: 'text-red-700 dark:text-red-300',
        icon: <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />,
      }
    : {
        wrap: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        heading: 'text-amber-900 dark:text-amber-200',
        days: 'text-amber-700 dark:text-amber-300',
        icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />,
      };

  return (
    <div className={`rounded-lg border px-4 py-3 mb-6 ${palette.wrap}`} data-testid="currency-expiry-banner">
      <div className="flex items-start gap-3">
        {palette.icon}
        <div className="min-w-0 flex-1">
          <h2 className={`font-semibold text-sm ${palette.heading}`}>
            {hasExpired ? t('expiryBanner.headingExpired') : t('expiryBanner.headingExpiring')}
          </h2>
          <p className={`text-xs ${palette.heading} opacity-80 mt-0.5`}>
            {t('expiryBanner.subtitle', { count: items.length })}
          </p>

          <ul className="mt-3 space-y-2.5">
            {visibleItems.map((item) => (
              <li key={item.id} data-testid={`currency-expiry-item-${item.id}`}>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`text-sm font-medium ${palette.heading}`}>
                    {item.label}
                    {item.sublabel ? ` (${item.sublabel})` : ''}
                  </span>
                  {item.days !== null && (
                    <span className={`text-xs font-mono tabular-nums ${palette.days}`}>
                      {item.isExpired
                        ? t('expiredAgo', { days: Math.abs(item.days) })
                        : t('expiresIn', { days: item.days })}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${palette.heading} opacity-90 mt-0.5`}>
                  {t(`expiryBanner.nextSteps.${item.category}.${item.isExpired ? 'expired' : 'expiring'}`)}
                </p>
              </li>
            ))}
          </ul>

          {items.length > VISIBLE_LIMIT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={`mt-2.5 inline-flex items-center gap-1 text-xs font-medium ${palette.heading} hover:underline`}
            >
              {expanded ? (
                <>
                  {t('expiryBanner.showLess')} <ChevronUp className="w-3 h-3" aria-hidden="true" />
                </>
              ) : (
                <>
                  {t('expiryBanner.showMore', { count: hiddenCount })}{' '}
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
