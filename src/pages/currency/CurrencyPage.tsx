import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAllCurrencyStatus } from '../../hooks/useCurrency';
import { useCustomCurrencies, useDeleteCustomCurrency, useSetEnabledCustomCurrency, useSetNotifyCustomCurrency } from '../../hooks/useCustomCurrency';
import { ShareRuleModal } from '../../components/currency/ShareRuleModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useCredentials } from '../../hooks/useCredentials';
import { useLicenses } from '../../hooks/useLicenses';
import { useAircraftStats } from '../../hooks/useAircraft';
import { useRecencyPrefs } from '../../hooks/useRecencyPrefs';
import { recencyLevel, RECENCY_BADGE_CLASSES, RECENCY_REQUIRED_LANDINGS } from '../../lib/recency';
import { CurrencyCard } from '../../components/currency/CurrencyCard';
import { CustomCurrencyCard } from '../../components/currency/CustomCurrencyCard';
import { CurrencyExpiryBanner } from '../../components/currency/CurrencyExpiryBanner';
import { ChevronDown, ChevronRight, ShieldAlert, ShieldCheck, Wand2, Plus } from 'lucide-react';
import { isPast, differenceInDays } from 'date-fns';
import type { ClassRatingCurrency, PassengerCurrency as PassengerCurrencyType } from '../../types/api';
import HelpLink from '../../components/ui/HelpLink';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

const CLASS_TYPE_LABELS: Record<string, string> = {
  SEP_LAND: 'SEP (Land)', SEP_SEA: 'SEP (Sea)',
  MEP_LAND: 'MEP (Land)', MEP_SEA: 'MEP (Sea)',
  SET_LAND: 'SET (Land)', SET_SEA: 'SET (Sea)',
  TMG: 'TMG', IR: 'Instrument Rating', OTHER: 'Other',
};

const CREDENTIAL_DESCRIPTIONS: Record<string, string> = {
  EASA_CLASS1_MEDICAL: 'EASA Class 1 Medical — valid for 12 months (6 months for single-pilot CAT passenger operations after age 40, and for all holders after age 60)',
  EASA_CLASS2_MEDICAL: 'EASA Class 2 Medical — valid for 60 months if issued before age 40, 24 months after age 40',
  EASA_LAPL_MEDICAL: 'EASA LAPL Medical — valid for 60 months if issued before age 40, 24 months after age 40',
  FAA_CLASS1_MEDICAL: 'FAA Class 1 Medical — valid for 12 months (6 months after age 40)',
  FAA_CLASS2_MEDICAL: 'FAA Class 2 Medical — valid for 12 months (24 months if under 40)',
  FAA_CLASS3_MEDICAL: 'FAA Class 3 Medical — valid for 60 months (24 months after age 40)',
  LANGUAGE_PROFICIENCY_ICAO_4: 'ICAO Language Proficiency Level 4 — revalidation every 3 years',
  LANGUAGE_PROFICIENCY_ICAO_5: 'ICAO Language Proficiency Level 5 — revalidation every 6 years',
  LANGUAGE_PROFICIENCY_ICAO_6: 'ICAO Language Proficiency Level 6 — no revalidation required (expert)',
  SECURITY_CLEARANCE_ZUP: 'German ZÜP Security Clearance — validity varies by issuing authority',
  SECURITY_CLEARANCE_ZUBB: 'German ZüBB Security Clearance — typically valid for 5 years',
};

export default function CurrencyPage() {
  const { data: currencyStatus, isLoading: currencyLoading } = useAllCurrencyStatus();
  const { data: customRules } = useCustomCurrencies();
  const deleteCustom = useDeleteCustomCurrency();
  const setEnabledCustom = useSetEnabledCustomCurrency();
  const setNotifyCustom = useSetNotifyCustomCurrency();
  const navigate = useNavigate();
  // Active rules first; paused (disabled) rules sink to the bottom. Array sort
  // is stable, so each group keeps its original creation order.
  const sortedCustomRules = customRules
    ? [...customRules].sort((a, b) => Number(b.rule.enabled) - Number(a.rule.enabled))
    : [];
  const [shareRuleId, setShareRuleId] = useState<string | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const shareRule = customRules?.find((r) => r.rule.id === shareRuleId)?.rule ?? null;
  const deleteRule = customRules?.find((r) => r.rule.id === deleteRuleId)?.rule ?? null;
  const { data: credentials, isLoading: credentialsLoading } = useCredentials();
  const { data: licenses } = useLicenses();
  const { data: aircraftStats } = useAircraftStats();
  const [expandedLicenses, setExpandedLicenses] = useState<Record<string, boolean>>({});
  const { t } = useTranslation('currency');
  const { fmtDate } = useFormatPrefs();

  // Informational 90-day recency rows: models first, then registrations.
  // Each group is gated by its user preference (Profile → Settings).
  const recencyPrefs = useRecencyPrefs();
  const recencyRows = [
    ...(recencyPrefs.perModel
      ? [...(aircraftStats?.byType.values() ?? [])].map((s) => ({
          key: `type-${s.aircraftType}`,
          label: s.aircraftType,
          kind: 'model' as const,
          landings: s.landingsLast90Days,
          lapsesOn: s.recencyLapsesOn,
          lastFlown: s.lastFlightDate,
        }))
      : []),
    ...(recencyPrefs.perRegistration
      ? [...(aircraftStats?.byReg.values() ?? [])].map((s) => ({
          key: `reg-${s.registration}`,
          label: s.registration,
          kind: 'registration' as const,
          landings: s.landingsLast90Days,
          lapsesOn: s.recencyLapsesOn,
          lastFlown: s.lastFlightDate,
        }))
      : []),
  ];

  const toggleLicense = (licenseId: string) => {
    setExpandedLicenses((prev) => ({ ...prev, [licenseId]: !prev[licenseId] }));
  };

  // Group ratings by licenseId
  const ratingsByLicense: Record<string, ClassRatingCurrency[]> = {};
  if (currencyStatus?.ratings) {
    for (const r of currencyStatus.ratings) {
      if (!ratingsByLicense[r.licenseId]) {
        ratingsByLicense[r.licenseId] = [];
      }
      ratingsByLicense[r.licenseId].push(r);
    }
  }

  // Count alerts
  const expiringRatings = currencyStatus?.ratings.filter((r) => r.status === 'expiring' || r.status === 'expired') || [];
  const now = new Date();
  const expiringCredentials = credentials?.filter((c) => {
    if (!c.expiryDate) return false;
    const days = differenceInDays(new Date(c.expiryDate), now);
    return days <= 90;
  }) || [];
  const totalAlerts = expiringRatings.length + expiringCredentials.length;

  const isLoading = currencyLoading || credentialsLoading;

  return (
    <div className="mx-auto max-w-[960px] py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            {totalAlerts > 0 ? <ShieldAlert className="w-6 h-6 text-amber-500" /> : <ShieldCheck className="w-6 h-6 text-green-500" />}
            {t('title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            {t('subtitle')}
            <HelpLink topic="currency" />
          </p>
        </div>
        {totalAlerts > 0 && (
          <span className="badge-expiring">
            {t('alerts', { count: totalAlerts })}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{t('loading')}</div>
      )}

      {!isLoading && currencyStatus && (
        <CurrencyExpiryBanner ratings={currencyStatus.ratings} flightReview={currencyStatus.flightReview} />
      )}

      {/* Custom currency — user-authored, modular rules */}
      {!isLoading && (
        <div className="mb-8" data-testid="custom-currency-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-violet-500" />
              {t('customCurrency.title', { defaultValue: 'Custom currency' })}
            </h2>
            <Link
              to="/currency/builder"
              className="btn-secondary text-sm inline-flex items-center gap-1.5"
              data-testid="open-currency-builder"
            >
              <Plus className="w-4 h-4" />
              {t('customCurrency.build', { defaultValue: 'Build a rule' })}
            </Link>
          </div>
          {customRules && customRules.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {sortedCustomRules.map((item) => (
                <CustomCurrencyCard
                  key={item.rule.id}
                  item={item}
                  onEdit={(id) => navigate(`/currency/builder?rule=${id}`)}
                  onShare={(id) => setShareRuleId(id)}
                  onDelete={(id) => setDeleteRuleId(id)}
                  onToggleEnabled={(id, enabled) => setEnabledCustom.mutate({ id, enabled })}
                  onToggleNotify={(id, notify) => setNotifyCustom.mutate({ id, notify })}
                />
              ))}
            </div>
          ) : (
            <Link
              to="/currency/builder"
              className="card block text-center py-8 hover-lift"
              data-testid="custom-currency-empty"
            >
              <Wand2 className="w-6 h-6 mx-auto text-violet-400 mb-2" />
              <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                {t('customCurrency.emptyTitle', { defaultValue: 'Build your own currency rules' })}
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                {t('customCurrency.emptyHint', {
                  defaultValue: 'Combine flights, aircraft and requirements into rules we track for you — and share them.',
                })}
              </p>
            </Link>
          )}
        </div>
      )}

      {/* Class Rating Currency — grouped by license */}
      {!isLoading && currencyStatus && (
        <div className="mb-8">
          <h2 className="section-title mb-4">{t('ratingCurrency')}</h2>

          {/* FAA Flight Review (§61.56) — per-pilot, shown at top of Tier 1 */}
          {currencyStatus.flightReview && (
            <div
              className={`card border-l-4 mb-4 ${
                currencyStatus.flightReview.status === 'current' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' :
                currencyStatus.flightReview.status === 'expiring' ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20' :
                'border-l-red-500 bg-red-50 dark:bg-red-900/20'
              }`}
              data-testid="flight-review-card"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                  ✈️ {t('flightReview')}
                </h3>
                <span className={
                  currencyStatus.flightReview.status === 'current' ? 'badge-current' :
                  currencyStatus.flightReview.status === 'expiring' ? 'badge-expiring' :
                  'badge-expired'
                }>
                  {t(`status.${currencyStatus.flightReview.status}`)}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{currencyStatus.flightReview.message}</p>
              {currencyStatus.flightReview.lastCompleted && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Last completed: {currencyStatus.flightReview.lastCompleted}
                  {currencyStatus.flightReview.expiresOn && ` · Expires: ${currencyStatus.flightReview.expiresOn}`}
                </p>
              )}
            </div>
          )}

          {Object.keys(ratingsByLicense).length === 0 && (
            <div className="card text-center py-8">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {t('noRatings')}
              </p>
            </div>
          )}

          {Object.entries(ratingsByLicense).map(([licenseId, ratings]) => {
            const license = licenses?.find((l) => l.id === licenseId);
            const isExpanded = expandedLicenses[licenseId] !== false; // default expanded
            const hasAlert = ratings.some((r) => r.status === 'expiring' || r.status === 'expired');

            return (
              <div key={licenseId} className="mb-4">
                {/* License header (collapsible) */}
                <button
                  onClick={() => toggleLicense(licenseId)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex-1">
                    {license ? `${license.regulatoryAuthority} ${license.licenseType}` : ratings[0]?.regulatoryAuthority || 'License'}
                    {license?.licenseNumber && <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">({license.licenseNumber})</span>}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{ratings.length} rating{ratings.length !== 1 ? 's' : ''}</span>
                  {hasAlert && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                </button>

                {/* Class rating cards */}
                {isExpanded && (
                  <div className="grid gap-3 sm:grid-cols-2 mt-3 pl-2">
                    {ratings.map((rating) => (
                      <div key={rating.classRatingId}>
                        <CurrencyCard rating={rating} />
                        {rating.ruleDescription && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 px-1 italic">
                            {(rating as any).ruleDescriptionKey
                              ? t(`ruleDescriptions.${(rating as any).ruleDescriptionKey}`, { defaultValue: rating.ruleDescription })
                              : rating.ruleDescription}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tier 2: Passenger Currency */}
      {!isLoading && currencyStatus && currencyStatus.passengerCurrency && currencyStatus.passengerCurrency.length > 0 && (
        <div className="mb-8" data-testid="passenger-currency-section">
          <h2 className="section-title mb-4">{t('passengerCurrency')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {t('passengerCurrencyDesc')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {currencyStatus.passengerCurrency.map((pax: PassengerCurrencyType) => {
              const dayOk = pax.dayStatus === 'current';
              const nightOk = pax.nightStatus === 'current';
              const hasNight = pax.nightPrivilege !== false;
              const allOk = hasNight ? (dayOk && nightOk) : dayOk;
              const classLabel = CLASS_TYPE_LABELS[pax.classType] || pax.classType;

              return (
                <div
                  key={`pax-${pax.classType}-${pax.regulatoryAuthority}`}
                  className={`card border-l-4 ${allOk ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' : dayOk ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-l-red-500 bg-red-50 dark:bg-red-900/20'}`}
                  data-testid={`passenger-currency-${pax.classType}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                      {classLabel}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">({pax.regulatoryAuthority})</span>
                    </h3>
                    <span className={allOk ? 'badge-current' : dayOk ? 'badge-expiring' : 'badge-expired'}>
                      {allOk ? t('status.current') : dayOk && hasNight ? t('status.dayOnly') : dayOk ? t('status.current') : t('status.notCurrent')}
                    </span>
                  </div>
                  {/* Day currency bar */}
                  <div className="space-y-1 mb-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {dayOk ? '✓' : '○'} Day
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {pax.dayLandings} / {pax.dayRequired} landings
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dayOk ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min((pax.dayLandings / pax.dayRequired) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  {/* Night currency bar — hidden when nightPrivilege is false */}
                  {hasNight && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {nightOk ? '✓' : '○'} Night
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {pax.nightLandings} / {pax.nightRequired} landings
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${nightOk ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min((pax.nightLandings / pax.nightRequired) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  )}
                  {!hasNight && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1" data-testid="night-not-applicable">
                      {t('nightNotApplicable')}
                    </p>
                  )}
                  {/* Passenger privilege badge (LAPL, SPL, UL) */}
                  {pax.passengerPrivilege && (
                    <div
                      className={`mt-2 px-2 py-1 rounded text-xs ${pax.passengerPrivilege.eligible ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}
                      data-testid="passenger-privilege-badge"
                    >
                      {pax.passengerPrivilege.eligible ? '✓' : '⚠'} {pax.passengerPrivilege.message}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">
                    {(pax as any).ruleDescriptionKey
                      ? t(`ruleDescriptions.${(pax as any).ruleDescriptionKey}`, { defaultValue: pax.ruleDescription })
                      : pax.ruleDescription}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Informational 90-day recency per model and registration */}
      {!isLoading && recencyRows.length > 0 && (
        <div className="mb-8" data-testid="aircraft-recency-section">
          <h2 className="section-title mb-4">{t('aircraftRecency.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {t('aircraftRecency.description', { required: RECENCY_REQUIRED_LANDINGS })}
          </p>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-2.5 font-medium">{t('aircraftRecency.aircraft')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('aircraftRecency.landings90')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('aircraftRecency.status')}</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">{t('aircraftRecency.lastFlown')}</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">{t('aircraftRecency.currentUntil')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {recencyRows.map((row) => {
                  const level = recencyLevel(row.landings);
                  return (
                    <tr key={row.key} data-testid={`recency-${row.key}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{row.label}</span>
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                          {t(`aircraftRecency.kind.${row.kind}`)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {row.landings} / {RECENCY_REQUIRED_LANDINGS}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`badge text-xs ${RECENCY_BADGE_CLASSES[level]}`}>
                          {t(`aircraftRecency.level.${level}`)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-slate-500 dark:text-slate-400 tabular-nums">
                        {row.lastFlown ? fmtDate(row.lastFlown) : '—'}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-slate-500 dark:text-slate-400 tabular-nums">
                        {row.lapsesOn ? fmtDate(row.lapsesOn) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credentials Section */}
      {!isLoading && credentials && credentials.length > 0 && (
        <div className="mb-8">
          <h2 className="section-title mb-4">{t('credentials')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {credentials.map((cred) => {
              const expired = cred.expiryDate ? isPast(new Date(cred.expiryDate)) : false;
              const daysLeft = cred.expiryDate ? differenceInDays(new Date(cred.expiryDate), now) : null;
              const expiringSoon = daysLeft !== null && daysLeft <= 90 && !expired;

              const statusColor = expired
                ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                : expiringSoon
                  ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-l-green-500 bg-green-50 dark:bg-green-900/20';

              const statusBadge = expired
                ? { text: t('status.expired'), cls: 'badge-expired' }
                : expiringSoon
                  ? { text: t('status.expiring'), cls: 'badge-expiring' }
                  : { text: t('status.valid'), cls: 'badge-current' };

              const description = CREDENTIAL_DESCRIPTIONS[cred.credentialType] || cred.credentialType.replace(/_/g, ' ');

              return (
                <div key={cred.id} className={`card border-l-4 ${statusColor}`} data-testid={`credential-${cred.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                        {cred.credentialType.replace(/_/g, ' ')}
                      </h3>
                      {cred.credentialNumber && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{cred.credentialNumber}</p>
                      )}
                    </div>
                    <span className={`${statusBadge.cls}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    {cred.issuingAuthority && <p>{t('issuingAuthority')}: {cred.issuingAuthority}</p>}
                    <p>{t('issued')}: {cred.issueDate}</p>
                    {cred.expiryDate && (
                      <p>
                        {t('expiresLabel', { date: fmtDate(cred.expiryDate) })}
                        {daysLeft !== null && (
                          <span className={`ml-1 font-medium font-mono tabular-nums ${expired ? 'text-red-600 dark:text-red-400' : expiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                            ({expired ? t('expiredAgo', { days: Math.abs(daysLeft) }) : t('expiresIn', { days: daysLeft })})
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">
                    {description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && (!credentials || credentials.length === 0) && (
        <div className="card text-center py-8 mb-8">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t('noCredentials')}
          </p>
        </div>
      )}

      {shareRule && <ShareRuleModal rule={shareRule} onClose={() => setShareRuleId(null)} />}

      <ConfirmDialog
        open={!!deleteRule}
        title={t('customCurrency.deleteTitle', { defaultValue: 'Delete this rule?' })}
        description={t('customCurrency.deleteDescription', {
          defaultValue: `“${deleteRule?.name ?? ''}” will be permanently removed. This cannot be undone.`,
          name: deleteRule?.name ?? '',
        })}
        confirmLabel={t('common:delete', { defaultValue: 'Delete' })}
        isLoading={deleteCustom.isPending}
        onCancel={() => setDeleteRuleId(null)}
        onConfirm={async () => {
          if (deleteRuleId) await deleteCustom.mutateAsync(deleteRuleId);
          setDeleteRuleId(null);
        }}
      />
    </div>
  );
}
