import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { FormModal } from '../ui/FormModal';
import {
  useCreateCustomReport,
  useCustomReportPreview,
  useUpdateCustomReport,
} from '../../hooks/useCustomReports';
import {
  DEFAULT_LIMIT,
  DEFAULT_WINDOW,
  GROUP_BYS,
  isDefinitionValid,
  isRankedGrouping,
  MAX_NAME_LENGTH,
  METRICS,
  METRIC_FEATURES,
  normalizeDefinition,
  STRUCTURED_FILTER_KEYS,
  WINDOW_KINDS,
  type CustomReport,
  type CustomReportDefinition,
  type CustomReportGroupBy,
  type CustomReportMetric,
  type CustomReportWindowKind,
  type StructuredFilterKey,
} from '../../lib/customReports';
import { CustomReportChart, OtherGroupsNote } from './CustomReportChart';
import { FeatureOptions } from '../relevance';
import { useCustomReportFormat, useLogbookLabel } from './customReportFormat';

interface CustomReportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Report to edit; omitted to create one. */
  report?: CustomReport;
  /** Starting definition when creating. */
  initialDefinition?: CustomReportDefinition;
}

/** Create/edit dialog for a custom report, with a live preview. */
export function CustomReportDialog({ open, onClose, report, initialDefinition }: CustomReportDialogProps) {
  const { t } = useTranslation('reports');
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={report ? t('custom.dialog.editTitle') : t('custom.dialog.createTitle')}
      size="2xl"
    >
      <CustomReportForm report={report} initialDefinition={initialDefinition} onClose={onClose} />
    </FormModal>
  );
}

const EMPTY_DEFINITION: CustomReportDefinition = {
  filter: {},
  window: DEFAULT_WINDOW,
  groupBy: 'month',
  metric: 'totalTime',
};

function CustomReportForm({
  report,
  initialDefinition,
  onClose,
}: {
  report?: CustomReport;
  initialDefinition?: CustomReportDefinition;
  onClose: () => void;
}) {
  const { t } = useTranslation(['reports', 'common']);
  const navigate = useNavigate();
  const idPrefix = useId();
  const { fmtMetric } = useCustomReportFormat();
  const logbookLabel = useLogbookLabel();

  const [name, setName] = useState(report?.name ?? '');
  const [definition, setDefinition] = useState<CustomReportDefinition>(
    () => report?.definition ?? initialDefinition ?? EMPTY_DEFINITION
  );
  const [saved, setSaved] = useState<CustomReport | null>(null);

  const create = useCreateCustomReport();
  const update = useUpdateCustomReport();
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  const normalized = useMemo(() => normalizeDefinition(definition), [definition]);
  const definitionValid = isDefinitionValid(normalized);
  const nameValid = name.trim().length > 0 && name.trim().length <= MAX_NAME_LENGTH;
  const preview = useCustomReportPreview(normalized, definitionValid && !saved);

  const ranked = isRankedGrouping(definition.groupBy);
  const win = definition.window;

  const setWindowKind = (kind: CustomReportWindowKind) =>
    setDefinition((d) => ({
      ...d,
      window: {
        kind,
        ...(kind === 'lastMonths' ? { months: d.window.months ?? DEFAULT_WINDOW.months } : {}),
        ...(kind === 'range' ? { startDate: d.window.startDate, endDate: d.window.endDate } : {}),
      },
    }));

  const setWindowField = (field: 'months' | 'startDate' | 'endDate', value: string) =>
    setDefinition((d) => ({
      ...d,
      window: {
        ...d.window,
        [field]: field === 'months' ? (value === '' ? undefined : Number(value)) : value || undefined,
      },
    }));

  const removeFilter = (key: StructuredFilterKey) =>
    setDefinition((d) => {
      const filter = { ...d.filter };
      delete filter[key];
      return { ...d, filter };
    });

  const chipText = (key: StructuredFilterKey, value: string) => {
    switch (key) {
      case 'aircraftReg':
        return t('custom.filter.aircraftRegValue', { value });
      case 'departureIcao':
        return t('custom.filter.departureValue', { value });
      case 'arrivalIcao':
        return t('custom.filter.arrivalValue', { value });
      case 'role':
        return t(`custom.filter.role.${value}`);
      case 'logbookLicenseId':
        return logbookLabel(value) ?? t('custom.filter.logbook');
    }
  };

  const chips = STRUCTURED_FILTER_KEYS.flatMap((key) => {
    const value = definition.filter[key];
    return value ? [{ key, text: chipText(key, value) }] : [];
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValid || !definitionValid || saving) return;
    const input = { name: name.trim(), definition: normalized };
    try {
      if (report) {
        await update.mutateAsync({ id: report.id, input });
        onClose();
      } else {
        setSaved(await create.mutateAsync(input));
      }
    } catch {
      // Shown from the mutation's error state.
    }
  };

  if (saved) {
    return (
      <div className="text-center py-6" role="status">
        <CheckCircle2
          className="w-12 h-12 mx-auto mb-3 text-green-500 dark:text-green-400"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('custom.dialog.savedTitle')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          {t('custom.dialog.savedDescription', { name: saved.name })}
        </p>
        <div className="flex flex-col-reverse sm:flex-row justify-center gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common:close')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              navigate('/reports#custom');
            }}
          >
            {t('custom.dialog.viewInReports')}
          </button>
        </div>
      </div>
    );
  }

  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const previewResult = preview.data;

  return (
    <form onSubmit={handleSave} className="space-y-5" noValidate>
      <div>
        <label htmlFor={fieldId('name')} className="form-label">
          {t('custom.dialog.name')}
        </label>
        <input
          id={fieldId('name')}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder={t('custom.dialog.namePlaceholder')}
          className="input"
          required
          aria-required="true"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={fieldId('metric')} className="form-label">
            {t('custom.dialog.metric')}
          </label>
          <select
            id={fieldId('metric')}
            value={definition.metric}
            onChange={(e) => setDefinition((d) => ({ ...d, metric: e.target.value as CustomReportMetric }))}
            className="input"
          >
            <FeatureOptions
              options={METRICS.map((m) => ({ value: m, label: t(`custom.metric.${m}`), feature: METRIC_FEATURES[m] }))}
              current={definition.metric}
              moreLabel={t('relevance:moreMetrics')}
              moreTestId="more-metrics"
            />
          </select>
        </div>
        <div>
          <label htmlFor={fieldId('groupBy')} className="form-label">
            {t('custom.dialog.groupBy')}
          </label>
          <select
            id={fieldId('groupBy')}
            value={definition.groupBy}
            onChange={(e) => setDefinition((d) => ({ ...d, groupBy: e.target.value as CustomReportGroupBy }))}
            className="input"
          >
            {GROUP_BYS.map((g) => (
              <option key={g} value={g}>
                {t(`custom.groupBy.${g}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={fieldId('window')} className="form-label">
            {t('custom.dialog.window')}
          </label>
          <select
            id={fieldId('window')}
            value={win.kind}
            onChange={(e) => setWindowKind(e.target.value as CustomReportWindowKind)}
            className="input"
          >
            {WINDOW_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`custom.window.${k}`)}
              </option>
            ))}
          </select>
        </div>

        {win.kind === 'lastMonths' && (
          <div>
            <label htmlFor={fieldId('months')} className="form-label">
              {t('custom.dialog.months')}
            </label>
            <input
              id={fieldId('months')}
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={win.months ?? ''}
              onChange={(e) => setWindowField('months', e.target.value)}
              className={definitionValid ? 'input' : 'input input-error'}
            />
          </div>
        )}

        {win.kind === 'range' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={fieldId('from')} className="form-label">
                {t('custom.dialog.from')}
              </label>
              <input
                id={fieldId('from')}
                type="date"
                value={win.startDate ?? ''}
                onChange={(e) => setWindowField('startDate', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor={fieldId('to')} className="form-label">
                {t('custom.dialog.to')}
              </label>
              <input
                id={fieldId('to')}
                type="date"
                value={win.endDate ?? ''}
                onChange={(e) => setWindowField('endDate', e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}

        {ranked && (
          <div>
            <label htmlFor={fieldId('limit')} className="form-label">
              {t('custom.dialog.limit')}
            </label>
            <input
              id={fieldId('limit')}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              placeholder={String(DEFAULT_LIMIT)}
              value={definition.limit ?? ''}
              onChange={(e) =>
                setDefinition((d) => ({
                  ...d,
                  limit: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
              className="input"
            />
          </div>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="form-label">{t('custom.dialog.filter')}</legend>
        <input
          type="text"
          value={definition.filter.q ?? ''}
          onChange={(e) => setDefinition((d) => ({ ...d, filter: { ...d.filter, q: e.target.value } }))}
          placeholder={t('custom.dialog.queryPlaceholder')}
          aria-label={t('custom.dialog.query')}
          className="input font-mono text-sm"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={t('custom.dialog.activeFilters')}>
            {chips.map((chip) => (
              <li
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 pl-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {chip.text}
                <button
                  type="button"
                  onClick={() => removeFilter(chip.key)}
                  aria-label={t('custom.filter.remove', { filter: chip.text })}
                  className="inline-flex items-center justify-center w-11 h-11 -my-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/40"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <section
        aria-label={t('custom.dialog.preview')}
        className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('custom.dialog.preview')}</h3>
          {preview.isFetching && (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-500" aria-label={t('custom.dialog.previewLoading')} />
          )}
        </div>
        {preview.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {preview.error.message}
          </p>
        ) : !definitionValid ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('custom.dialog.invalidDefinition')}</p>
        ) : previewResult ? (
          <div className={preview.isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <CustomReportChart result={previewResult} height="h-48" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              {t('custom.previewTotals', {
                count: previewResult.totals.flights,
                value: fmtMetric(previewResult.metric, previewResult.totals[previewResult.metric]),
                metric: t(`custom.metric.${previewResult.metric}`),
              })}
            </p>
            <OtherGroupsNote count={previewResult.otherGroups} />
          </div>
        ) : (
          <div className="h-48 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
        )}
      </section>

      {saveError && (
        <p className="form-error" role="alert">
          {saveError.message}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onClose}>
          {t('common:cancel')}
        </button>
        <button type="submit" className="btn-primary" disabled={!nameValid || !definitionValid || saving}>
          {saving ? t('common:saving') : report ? t('common:save') : t('custom.dialog.saveReport')}
        </button>
      </div>
    </form>
  );
}
