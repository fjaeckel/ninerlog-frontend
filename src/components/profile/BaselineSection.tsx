import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDeleteBaseline,
  useMyBaseline,
  useUpsertBaseline,
  type FlightBaseline,
  type FlightBaselineInput,
} from '../../hooks/useBaseline';
import { DurationInput } from '../flights/DurationInput';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

// Form state. Durations are stored as integer minutes (matching API storage and
// the rest of the app); landings/flight counts as strings so the input can be
// cleared while typing.
type FormState = {
  baselineDate: string;
  totalFlights: string;
  totalMinutes: number;
  picMinutes: number;
  sicMinutes: number;
  dualMinutes: number;
  dualGivenMinutes: number;
  multiPilotMinutes: number;
  nightMinutes: number;
  ifrMinutes: number;
  soloMinutes: number;
  crossCountryMinutes: number;
  landingsDay: string;
  landingsNight: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  baselineDate: new Date().toISOString().slice(0, 10),
  totalFlights: '',
  totalMinutes: 0,
  picMinutes: 0,
  sicMinutes: 0,
  dualMinutes: 0,
  dualGivenMinutes: 0,
  multiPilotMinutes: 0,
  nightMinutes: 0,
  ifrMinutes: 0,
  soloMinutes: 0,
  crossCountryMinutes: 0,
  landingsDay: '',
  landingsNight: '',
  notes: '',
};

function intOrZero(value: string): number {
  if (!value.trim()) return 0;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function baselineToForm(b: FlightBaseline): FormState {
  return {
    baselineDate: typeof b.baselineDate === 'string' ? b.baselineDate : EMPTY_FORM.baselineDate,
    totalFlights: b.totalFlights ? String(b.totalFlights) : '',
    totalMinutes: b.totalMinutes ?? 0,
    picMinutes: b.picMinutes ?? 0,
    sicMinutes: b.sicMinutes ?? 0,
    dualMinutes: b.dualMinutes ?? 0,
    dualGivenMinutes: b.dualGivenMinutes ?? 0,
    multiPilotMinutes: b.multiPilotMinutes ?? 0,
    nightMinutes: b.nightMinutes ?? 0,
    ifrMinutes: b.ifrMinutes ?? 0,
    soloMinutes: b.soloMinutes ?? 0,
    crossCountryMinutes: b.crossCountryMinutes ?? 0,
    landingsDay: b.landingsDay ? String(b.landingsDay) : '',
    landingsNight: b.landingsNight ? String(b.landingsNight) : '',
    notes: b.notes ?? '',
  };
}

function formToInput(form: FormState): FlightBaselineInput {
  return {
    baselineDate: form.baselineDate,
    totalFlights: intOrZero(form.totalFlights),
    totalMinutes: form.totalMinutes,
    picMinutes: form.picMinutes,
    sicMinutes: form.sicMinutes,
    dualMinutes: form.dualMinutes,
    dualGivenMinutes: form.dualGivenMinutes,
    multiPilotMinutes: form.multiPilotMinutes,
    nightMinutes: form.nightMinutes,
    ifrMinutes: form.ifrMinutes,
    soloMinutes: form.soloMinutes,
    crossCountryMinutes: form.crossCountryMinutes,
    landingsDay: intOrZero(form.landingsDay),
    landingsNight: intOrZero(form.landingsNight),
    notes: form.notes.trim() ? form.notes.trim() : null,
  };
}

export function BaselineSection() {
  const { t } = useTranslation('settings');
  const { data: baseline, isLoading } = useMyBaseline();
  const upsert = useUpsertBaseline();
  const remove = useDeleteBaseline();
  const { timeFormat } = useFormatPrefs();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const hasBaseline = Boolean(baseline);

  const openEditor = () => {
    setForm(baseline ? baselineToForm(baseline) : EMPTY_FORM);
    setShowForm(true);
  };
  const headerSummary = useMemo(() => {
    if (!baseline) return null;
    const hours = ((baseline.totalMinutes ?? 0) / 60).toFixed(1);
    const pic = ((baseline.picMinutes ?? 0) / 60).toFixed(1);
    return t('baseline.summary', {
      hours,
      pic,
      landings: (baseline.landingsDay ?? 0) + (baseline.landingsNight ?? 0),
      date: baseline.baselineDate,
    });
  }, [baseline, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await upsert.mutateAsync(formToInput(form));
      setMessage({ kind: 'ok', text: t('baseline.saveSuccess') });
      setShowForm(false);
    } catch (err) {
      setMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : t('baseline.saveFailed'),
      });
    }
  };

  const handleDelete = async () => {
    setMessage(null);
    try {
      await remove.mutateAsync();
      setForm(EMPTY_FORM);
      setShowForm(false);
      setShowDeleteConfirm(false);
      setMessage({ kind: 'ok', text: t('baseline.deleteSuccess') });
    } catch (err) {
      setMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : t('baseline.deleteFailed'),
      });
    }
  };

  return (
    <div className="card" data-testid="baseline-section">
      <h2 className="section-title mb-2">{t('baseline.title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {t('baseline.description')}
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('baseline.loading')}</p>
      ) : (
        <>
          {hasBaseline && !showForm && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-200">{headerSummary}</p>
              <div className="flex gap-3">
                <button type="button" onClick={openEditor} className="btn-secondary">
                  {t('baseline.edit')}
                </button>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-secondary text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {t('baseline.delete')}
                  </button>
                ) : null}
              </div>
              {showDeleteConfirm && (
                <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-300">{t('baseline.deleteConfirm')}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={remove.isPending}
                      className="btn-danger"
                    >
                      {remove.isPending ? t('common:deleting') : t('baseline.deleteButton')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-secondary text-sm"
                    >
                      {t('common:cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasBaseline && !showForm && (
            <button type="button" onClick={openEditor} className="btn-primary">
              {t('baseline.create')}
            </button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('baseline.fields.baselineDate')} required>
                  <input
                    type="date"
                    required
                    value={form.baselineDate}
                    onChange={(e) => setForm((s) => ({ ...s, baselineDate: e.target.value }))}
                    className="input"
                  />
                </Field>
                <Field label={t('baseline.fields.totalFlights')}>
                  <NumberInput value={form.totalFlights} onChange={(v) => setForm((s) => ({ ...s, totalFlights: v }))} integer />
                </Field>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <HoursField label={t('baseline.fields.totalHours')} value={form.totalMinutes} onChange={(v) => setForm((s) => ({ ...s, totalMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.picHours')} value={form.picMinutes} onChange={(v) => setForm((s) => ({ ...s, picMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.sicHours')} value={form.sicMinutes} onChange={(v) => setForm((s) => ({ ...s, sicMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.dualHours')} value={form.dualMinutes} onChange={(v) => setForm((s) => ({ ...s, dualMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.dualGivenHours')} value={form.dualGivenMinutes} onChange={(v) => setForm((s) => ({ ...s, dualGivenMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.multiPilotHours')} value={form.multiPilotMinutes} onChange={(v) => setForm((s) => ({ ...s, multiPilotMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.soloHours')} value={form.soloMinutes} onChange={(v) => setForm((s) => ({ ...s, soloMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.crossCountryHours')} value={form.crossCountryMinutes} onChange={(v) => setForm((s) => ({ ...s, crossCountryMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.nightHours')} value={form.nightMinutes} onChange={(v) => setForm((s) => ({ ...s, nightMinutes: v }))} displayFormat={timeFormat} />
                <HoursField label={t('baseline.fields.ifrHours')} value={form.ifrMinutes} onChange={(v) => setForm((s) => ({ ...s, ifrMinutes: v }))} displayFormat={timeFormat} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('baseline.fields.landingsDay')}>
                  <NumberInput value={form.landingsDay} onChange={(v) => setForm((s) => ({ ...s, landingsDay: v }))} integer />
                </Field>
                <Field label={t('baseline.fields.landingsNight')}>
                  <NumberInput value={form.landingsNight} onChange={(v) => setForm((s) => ({ ...s, landingsNight: v }))} integer />
                </Field>
              </div>

              <Field label={t('baseline.fields.notes')}>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                  className="input"
                  placeholder={t('baseline.fields.notesPlaceholder') ?? ''}
                />
              </Field>

              <div className="flex gap-3">
                <button type="submit" disabled={upsert.isPending} className="btn-primary">
                  {upsert.isPending ? t('common:saving') : t('baseline.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setMessage(null);
                    if (baseline) setForm(baselineToForm(baseline));
                  }}
                  className="btn-secondary"
                >
                  {t('common:cancel')}
                </button>
              </div>
            </form>
          )}

          {message && (
            <p
              className={`text-sm mt-3 ${
                message.kind === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
              role="status"
            >
              {message.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function HoursField({
  label,
  value,
  onChange,
  displayFormat,
}: {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
  displayFormat: 'hm' | 'decimal';
}) {
  const placeholder = displayFormat === 'decimal' ? '0.0' : '0:00';
  return (
    <Field label={label}>
      <DurationInput
        value={value}
        onChange={onChange}
        displayFormat={displayFormat}
        placeholder={placeholder}
      />
    </Field>
  );
}

function NumberInput({
  value,
  onChange,
  integer,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  integer?: boolean;
  step?: string;
}) {
  return (
    <input
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      min={0}
      step={integer ? 1 : step ?? '0.1'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    />
  );
}
