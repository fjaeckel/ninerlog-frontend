import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import {
  useCreateLogbookCertification,
  useLogbookCertifications,
  useLogbookMode,
  useUpdateLogbookMode,
  type LogbookModeLicence,
} from '../../hooks/useLogbook';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { RecordsDialog } from '../logbook/RecordsDialog';
import { countryName } from '../../lib/countries';
import { extractApiCode, extractApiError } from '../../lib/errors';

/** Today as YYYY-MM-DD in the browser's time zone. */
function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Settings → Logbook: strict mode, its switch history and logbook certification. */
export function LogbookSection() {
  const { t, i18n } = useTranslation('logbook');
  const { fmtDate, fmtDateTime } = useFormatPrefs();
  const { data: mode, isLoading, isError } = useLogbookMode();
  const updateMode = useUpdateLogbookMode();
  const { data: certifications } = useLogbookCertifications();
  const createCertification = useCreateLogbookCertification();

  const [confirmOff, setConfirmOff] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [modeError, setModeError] = useState('');
  const [through, setThrough] = useState(localToday);
  const [certMessage, setCertMessage] = useState('');
  const [certError, setCertError] = useState('');

  const strict = mode?.strict === true;
  const today = localToday();
  const latest = mode?.latestCertifiedThrough ?? null;

  const licenceList = (licences: LogbookModeLicence[]) =>
    licences
      .map((l) => `${l.regulatoryAuthority} ${l.licenseType} (${countryName(l.issuingCountry, i18n.language)})`)
      .join(', ');

  const setStrict = async (next: boolean) => {
    setModeError('');
    try {
      await updateMode.mutateAsync(next);
      if (next) setNoticeOpen(true);
    } catch (err) {
      setModeError(extractApiError(err, t('settings.updateFailed')));
    }
  };

  const onToggle = (checked: boolean) => {
    if (!checked && (mode?.requiredBy.length ?? 0) > 0) {
      setConfirmOff(true);
      return;
    }
    void setStrict(checked);
  };

  const certify = async () => {
    setCertMessage('');
    setCertError('');
    try {
      const created = await createCertification.mutateAsync(through);
      setCertMessage(t('settings.certify.success', { date: fmtDate(created.certifiedThrough) }));
    } catch (err) {
      const code = extractApiCode(err);
      if (code === 'strict_mode_required') setCertError(t('settings.certify.strictRequired'));
      else if (code === 'certification_in_future') setCertError(t('settings.certify.inFuture'));
      else if (code === 'certification_before_latest')
        setCertError(t('settings.certify.beforeLatest', { date: latest ? fmtDate(latest) : '' }));
      else setCertError(extractApiError(err, t('settings.certify.failed')));
    }
  };

  const throughInvalid = !through || through > today || (latest !== null && through < latest);
  const events = [...(mode?.events ?? [])].reverse();

  return (
    <div className="card" data-testid="logbook-section">
      <h2 className="section-title mb-4">{t('settings.title')}</h2>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/50" />
      ) : isError || !mode ? (
        <p className="text-sm text-red-600 dark:text-red-400">{t('settings.loadFailed')}</p>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="checkbox mt-0.5"
                checked={strict}
                disabled={updateMode.isPending}
                onChange={(e) => onToggle(e.target.checked)}
                data-testid="strict-logbook-toggle"
              />
              <span className="text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">{t('settings.strict')}</span>
                <span className="block text-slate-500 dark:text-slate-400">{t('settings.strictHelp')}</span>
              </span>
            </label>
            {modeError && <p className="form-error">{modeError}</p>}

            <div className="mt-3 space-y-1 pl-8 text-sm text-slate-600 dark:text-slate-300">
              {strict && mode.since && <p>{t('settings.since', { date: fmtDateTime(mode.since) })}</p>}
              {mode.requiredBy.length > 0 && (
                <p className="flex items-start gap-1.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>{t('settings.requiredBy', { licences: licenceList(mode.requiredBy) })}</span>
                </p>
              )}
              {mode.suggestedBy.length > 0 && (
                <p>{t('settings.suggestedBy', { licences: licenceList(mode.suggestedBy) })}</p>
              )}
              {strict && mode.draftWindow && (
                <p className="text-slate-500 dark:text-slate-400">{t(`settings.draftWindow.${mode.draftWindow}`)}</p>
              )}
              {strict && mode.overridesDownwardOnly && (
                <p className="text-slate-500 dark:text-slate-400">{t('settings.overridesDownwardOnly')}</p>
              )}
              <p>
                <button type="button" className="link text-sm" onClick={() => setRecordsOpen(true)}>
                  {t('records.link')}
                </button>
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('settings.events')}</h3>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.noEvents')}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {events.map((event, idx) => (
                  <li key={`${event.createdAt}-${idx}`} className="flex flex-wrap items-baseline gap-x-2">
                    <time
                      dateTime={event.createdAt}
                      className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400"
                    >
                      {fmtDateTime(event.createdAt)}
                    </time>
                    <span className={event.strict ? 'badge-current' : 'badge-neutral'}>
                      {event.strict ? t('settings.eventOn') : t('settings.eventOff')}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">{t(`settings.trigger.${event.trigger}`)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('settings.certify.title')}
            </h3>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t('settings.certify.help')}</p>
            {!strict && (
              <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">{t('settings.certify.strictRequired')}</p>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="certified-through" className="form-label">
                  {t('settings.certify.date')}
                </label>
                <input
                  id="certified-through"
                  type="date"
                  className="input w-auto"
                  value={through}
                  max={today}
                  min={latest ?? undefined}
                  disabled={!strict}
                  onChange={(e) => setThrough(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={!strict || throughInvalid || createCertification.isPending}
                onClick={certify}
              >
                {t('settings.certify.submit')}
              </button>
            </div>
            {certMessage && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{certMessage}</p>}
            {certError && <p className="form-error">{certError}</p>}

            <h4 className="mb-1 mt-4 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('settings.certify.list')}
            </h4>
            {certifications && certifications.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {certifications.map((c) => (
                  <li key={c.id} className="text-slate-700 dark:text-slate-200">
                    <span className="font-mono tabular-nums">{fmtDate(c.certifiedThrough)}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {' · '}
                      {t('settings.certify.certifiedAt', { date: fmtDateTime(c.certifiedAt) })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.certify.empty')}</p>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOff}
        onConfirm={async () => {
          setConfirmOff(false);
          await setStrict(false);
        }}
        onCancel={() => setConfirmOff(false)}
        title={t('settings.turnOffTitle')}
        description={t('settings.turnOffWarning', { licences: licenceList(mode?.requiredBy ?? []) })}
        confirmLabel={t('settings.turnOff')}
        variant="warning"
      />
      <RecordsDialog
        open={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        title={t('notice.title')}
        intro={t('notice.manual')}
      />
      <RecordsDialog open={recordsOpen} onClose={() => setRecordsOpen(false)} />
    </div>
  );
}
