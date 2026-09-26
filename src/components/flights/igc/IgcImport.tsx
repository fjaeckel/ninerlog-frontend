import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleAlert, FileUp, Loader2 } from 'lucide-react';
import { FileDropzone } from '../../ui/FileDropzone';
import { IgcSummary } from './IgcSummary';
import {
  IgcRequestError,
  toIgcError,
  useImportIgc,
  usePreviewIgc,
  type IgcFlightPreview,
  type IgcImportResult,
} from '../../../hooks/useFlightFiles';
import { useUpdateFlight } from '../../../hooks/useFlights';
import { useFeatures } from '../../../hooks/useFeatures';
import { useFormatPrefs } from '../../../hooks/useFormatPrefs';
import { DEFAULT_IGC_MAX_BYTES, IGC_ACCEPT, igcErrorMessage, launchMethodKey } from '../../../lib/igc';
import { LAUNCH_METHODS } from '../../../lib/launchMethod';
import { cn } from '../../../lib/cn';
import type { components } from '../../../api/schema';

type FlightUpdate = components['schemas']['FlightUpdate'];

type Status = 'pending' | 'analysing' | 'review' | 'importing' | 'created' | 'attached' | 'failed';

interface Item {
  file: File;
  status: Status;
  preview?: IgcFlightPreview;
  result?: IgcImportResult;
  error?: IgcRequestError;
}

type Choice = 'attach' | 'create';

interface IgcImportProps {
  /** Attaches every file to this flight instead of matching or creating one. */
  attachToFlightId?: string;
}

/** Drop or pick IGC files, preview one before saving, or import several one after the other. */
export function IgcImport({ attachToFlightId }: IgcImportProps) {
  const { t } = useTranslation('flights');
  const navigate = useNavigate();
  const { data: features } = useFeatures();
  const maxBytes = features?.flightFiles?.maxBytes || DEFAULT_IGC_MAX_BYTES;
  const maxMb = Math.round(maxBytes / (1024 * 1024));
  const preview = usePreviewIgc();
  const importIgc = useImportIgc();
  const updateFlight = useUpdateFlight();
  const { fmtDate } = useFormatPrefs();

  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [choice, setChoice] = useState<Choice>('create');
  const [launchMethod, setLaunchMethod] = useState('');
  const [correctionFailedFor, setCorrectionFailedFor] = useState<string | null>(null);
  const run = useRef(0);

  useEffect(() => () => {
    run.current += 1;
  }, []);

  const patch = (index: number, update: Partial<Item>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...update } : it)));
  };

  const analyse = async (file: File): Promise<IgcFlightPreview> => {
    if (file.size > maxBytes) throw new IgcRequestError(413, '');
    return preview.mutateAsync(file);
  };

  const startSingle = async (file: File, token: number) => {
    try {
      const p = await analyse(file);
      if (run.current !== token) return;
      setChoice(!attachToFlightId && p.matchingFlightId ? 'attach' : 'create');
      setLaunchMethod(p.launchMethod === 'unknown' ? '' : p.launchMethod);
      patch(0, { status: 'review', preview: p });
    } catch (err) {
      if (run.current === token) patch(0, { status: 'failed', error: toIgcError(err) });
    }
  };

  const startBatch = async (files: File[], token: number) => {
    for (const [index, file] of files.entries()) {
      if (run.current !== token) return;
      patch(index, { status: 'analysing' });
      try {
        const p = await analyse(file);
        if (run.current !== token) return;
        patch(index, { status: 'importing', preview: p });
        const flightId = attachToFlightId ?? p.matchingFlightId;
        const result = await importIgc.mutateAsync({ file, flightId });
        if (run.current !== token) return;
        patch(index, { status: flightId ? 'attached' : 'created', result });
      } catch (err) {
        if (run.current !== token) return;
        patch(index, { status: 'failed', error: toIgcError(err) });
      }
    }
  };

  const handleFiles = (files: File[]) => {
    const token = ++run.current;
    setRejected([]);
    setCorrectionFailedFor(null);
    setItems(files.map((file, i) => ({ file, status: i === 0 ? 'analysing' : 'pending' })));
    if (files.length === 1) void startSingle(files[0], token);
    else void startBatch(files, token);
  };

  const reset = () => {
    run.current += 1;
    setItems([]);
    setRejected([]);
    setCorrectionFailedFor(null);
  };

  const single = items.length === 1 ? items[0] : null;
  const detected = single?.preview && single.preview.launchMethod !== 'unknown' ? single.preview.launchMethod : '';
  const attaching = !!attachToFlightId || choice === 'attach';
  const cannotCreate = !attaching && !!single?.preview && !single.preview.gliderRegistration;

  const confirmSingle = async () => {
    if (!single?.preview) return;
    const token = run.current;
    const flightId = attachToFlightId ?? (choice === 'attach' ? single.preview.matchingFlightId : undefined);
    patch(0, { status: 'importing', error: undefined });
    let result: IgcImportResult;
    try {
      result = await importIgc.mutateAsync({ file: single.file, flightId });
    } catch (err) {
      if (run.current === token) patch(0, { status: 'review', error: toIgcError(err) });
      return;
    }
    if (run.current !== token) return;
    const id = result.flight.id;
    if (!flightId && launchMethod !== detected) {
      try {
        const data = { launchMethod: launchMethod || null, releaseHeightM: null } as FlightUpdate;
        await updateFlight.mutateAsync({ id, data });
      } catch {
        if (run.current !== token) return;
        patch(0, { status: 'created', result });
        setCorrectionFailedFor(id);
        return;
      }
    }
    if (run.current === token) navigate(`/flights/${id}`);
  };

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        {rejected.length > 0 && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {rejected.map((name) => (
              <p key={name}>{t('igc.rejected', { name })}</p>
            ))}
          </div>
        )}
        <FileDropzone
          accept={IGC_ACCEPT}
          onFilesSelected={handleFiles}
          onFileRejected={(file) => setRejected((prev) => [...prev, file.name])}
          buttonLabel={t('igc.selectFiles')}
          hint={t('igc.dropHint', { size: maxMb })}
          className="card text-center py-12"
        >
          <FileUp className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('igc.dropTitle')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">{t('igc.dropDescription')}</p>
        </FileDropzone>
      </div>
    );
  }

  if (single) {
    return (
      <div className="space-y-4">
        {single.status === 'analysing' && (
          <div className="card flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('igc.analysing', { name: single.file.name })}
          </div>
        )}

        {single.preview && (
          <div className="card">
            <IgcSummary preview={single.preview} filename={single.file.name} />

            {single.status !== 'created' && (
              <div className="mt-5 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                {!attachToFlightId && single.preview.matchingFlightId && (
                  <fieldset>
                    <legend className="form-label">{t('igc.choiceLabel')}</legend>
                    <div className="space-y-2">
                      <ChoiceOption
                        checked={choice === 'attach'}
                        onChange={() => setChoice('attach')}
                        label={t('igc.attachExisting', { date: fmtDate(single.preview.date) })}
                        hint={t('igc.attachExistingHint')}
                      />
                      <ChoiceOption
                        checked={choice === 'create'}
                        onChange={() => setChoice('create')}
                        label={t('igc.createNew')}
                        hint={t('igc.createNewHint')}
                      />
                    </div>
                  </fieldset>
                )}

                {!attaching && (
                  <div>
                    <label htmlFor="igc-launch-method" className="form-label">{t('igc.launchCorrection')}</label>
                    <select
                      id="igc-launch-method"
                      className="input"
                      value={launchMethod}
                      onChange={(e) => setLaunchMethod(e.target.value)}
                    >
                      <option value="">{t('igc.launchNone')}</option>
                      {LAUNCH_METHODS.map((m) => (
                        <option key={m} value={m}>{t(`launchMethods.${launchMethodKey(m)}`)}</option>
                      ))}
                    </select>
                    <p className="form-helper">{t('igc.launchCorrectionHint')}</p>
                  </div>
                )}

                {cannotCreate && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    {t('igc.noRegistration')}
                  </p>
                )}

                {single.error && <ErrorLine error={single.error} maxMb={maxMb} />}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={confirmSingle}
                    disabled={single.status === 'importing' || cannotCreate}
                    aria-busy={single.status === 'importing'}
                  >
                    {single.status === 'importing' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {single.status === 'importing'
                      ? t('igc.importing')
                      : attaching
                        ? t('igc.importAttach')
                        : t('igc.importCreate')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={reset} disabled={single.status === 'importing'}>
                    {t('igc.chooseOther')}
                  </button>
                </div>
              </div>
            )}

            {correctionFailedFor && (
              <p role="alert" className="mt-4 text-sm text-amber-700 dark:text-amber-400">
                {t('igc.correctionFailed')}{' '}
                <Link className="link" to={`/flights/${correctionFailedFor}`}>{t('igc.openFlight')}</Link>
              </p>
            )}
          </div>
        )}

        {single.status === 'failed' && single.error && (
          <div className="card space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{single.file.name}</p>
            <ErrorLine error={single.error} maxMb={maxMb} />
            <button type="button" className="btn-secondary" onClick={reset}>
              {t('igc.chooseOther')}
            </button>
          </div>
        )}
      </div>
    );
  }

  const finished = items.filter((it) => ['created', 'attached', 'failed'].includes(it.status)).length;
  return (
    <div className="card space-y-4">
      <h2 className="section-title">{t('igc.batchTitle', { done: finished, count: items.length })}</h2>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700" data-testid="igc-batch">
        {items.map((it, i) => (
          <BatchRow key={`${i}-${it.file.name}`} item={it} maxMb={maxMb} />
        ))}
      </ul>
      {finished === items.length && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('igc.batchDone')}</p>
          <button type="button" className="btn-secondary" onClick={reset}>
            {t('igc.chooseOther')}
          </button>
        </div>
      )}
    </div>
  );
}

function ChoiceOption({ checked, onChange, label, hint }: { checked: boolean; onChange: () => void; label: string; hint: string }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5',
        checked
          ? 'border-blue-300 bg-blue-50/60 dark:border-blue-700 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700',
      )}
    >
      <input type="radio" name="igc-choice" checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </label>
  );
}

function ErrorLine({ error, maxMb }: { error: IgcRequestError; maxMb: number }) {
  const { t } = useTranslation('flights');
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">
        {igcErrorMessage(t, error, maxMb)}
        {error.existingFlightId && (
          <>
            {' '}
            <Link className="link" to={`/flights/${error.existingFlightId}`}>{t('igc.openFlight')}</Link>
          </>
        )}
      </span>
    </p>
  );
}

function BatchRow({ item, maxMb }: { item: Item; maxMb: number }) {
  const { t } = useTranslation('flights');
  const { fmtDate } = useFormatPrefs();
  const flight = item.result?.flight;
  let status: ReactNode;
  switch (item.status) {
    case 'created':
    case 'attached':
      status = (
        <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {flight ? (
            <Link className="link" to={`/flights/${flight.id}`}>
              {t(`igc.status.${item.status}`, { date: fmtDate(flight.date) })}
            </Link>
          ) : (
            t(`igc.status.${item.status}`, { date: '' })
          )}
        </span>
      );
      break;
    case 'failed':
      status = item.error ? <ErrorLine error={item.error} maxMb={maxMb} /> : t('igc.status.failed');
      break;
    case 'analysing':
    case 'importing':
      status = (
        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t(`igc.status.${item.status}`)}
        </span>
      );
      break;
    default:
      status = <span className="text-slate-400 dark:text-slate-500">{t('igc.status.pending')}</span>;
  }
  return (
    <li className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4" data-status={item.status}>
      <span className="min-w-0 break-all font-mono text-sm text-slate-700 dark:text-slate-200">{item.file.name}</span>
      <span className="text-sm sm:text-right">{status}</span>
    </li>
  );
}
