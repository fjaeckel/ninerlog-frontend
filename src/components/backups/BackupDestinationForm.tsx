import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { components } from '../../api/schema';
import {
  useBackupProviders,
  useCreateBackupDestination,
  useUpdateBackupDestination,
} from '../../hooks/useBackups';
import { extractApiError } from '../../lib/errors';

type BackupDestination = components['schemas']['BackupDestination'];
type BackupField = components['schemas']['BackupField'];
type BackupSchedule = components['schemas']['BackupSchedule'];

interface BackupDestinationFormProps {
  destination?: BackupDestination | null;
  onClose: () => void;
}

const SCHEDULES: BackupSchedule[] = ['manual', 'daily', 'weekly', 'monthly'];

export default function BackupDestinationForm({ destination, onClose }: BackupDestinationFormProps) {
  const { t } = useTranslation('backups');
  const { data: providers, isLoading: providersLoading } = useBackupProviders();
  const createMutation = useCreateBackupDestination();
  const updateMutation = useUpdateBackupDestination();

  const isEditing = !!destination;

  const [providerNameOverride, setProviderName] = useState<string | null>(
    destination?.provider ?? null,
  );
  const providerName = providerNameOverride ?? providers?.[0]?.name ?? '';
  const [displayName, setDisplayName] = useState(destination?.displayName ?? '');
  const [schedule, setSchedule] = useState<BackupSchedule>(destination?.schedule ?? 'manual');
  const [scheduleHourUtc, setScheduleHourUtc] = useState<number>(destination?.scheduleHourUtc ?? 3);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<number>(destination?.scheduleDayOfWeek ?? 0);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState<number>(destination?.scheduleDayOfMonth ?? 1);
  const [retentionCount, setRetentionCount] = useState<number>(destination?.retentionCount ?? 30);
  const [enabled, setEnabled] = useState<boolean>(destination?.enabled ?? true);
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    if (destination?.config) {
      for (const [k, v] of Object.entries(destination.config)) {
        out[k] = v == null ? '' : String(v);
      }
    }
    return out;
  });
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedProvider = useMemo(
    () => providers?.find((p) => p.name === providerName) ?? null,
    [providers, providerName],
  );

  const handleConfigChange = (name: string, value: string) => {
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleCredentialChange = (name: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSubmitting(true);
    try {
      if (isEditing && destination) {
        await updateMutation.mutateAsync({
          id: destination.id,
          data: {
            displayName,
            schedule,
            scheduleHourUtc: schedule === 'manual' ? undefined : scheduleHourUtc,
            scheduleDayOfWeek: schedule === 'weekly' ? scheduleDayOfWeek : undefined,
            scheduleDayOfMonth: schedule === 'monthly' ? scheduleDayOfMonth : undefined,
            retentionCount,
            enabled,
          },
        });
      } else {
        // Strip empty optional fields from config/credentials
        const configClean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(config)) {
          if (v !== '') configClean[k] = v;
        }
        const credsClean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(credentials)) {
          if (v !== '') credsClean[k] = v;
        }
        await createMutation.mutateAsync({
          provider: providerName,
          displayName,
          config: configClean,
          credentials: credsClean,
          schedule,
          scheduleHourUtc: schedule === 'manual' ? undefined : scheduleHourUtc,
          scheduleDayOfWeek: schedule === 'weekly' ? scheduleDayOfWeek : undefined,
          scheduleDayOfMonth: schedule === 'monthly' ? scheduleDayOfMonth : undefined,
          retentionCount,
          enabled,
        });
      }
      onClose();
    } catch (err) {
      setApiError(extractApiError(err, t('form.failedToSave')));
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (
    field: BackupField,
    value: string,
    onChange: (name: string, val: string) => void,
  ) => {
    const inputType =
      field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text';
    return (
      <div key={field.name}>
        <label htmlFor={`bf-${field.name}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          id={`bf-${field.name}`}
          type={inputType}
          required={field.required}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          autoComplete={field.type === 'password' ? 'new-password' : 'off'}
          className="input w-full"
        />
        {field.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{field.description}</p>
        )}
      </div>
    );
  };

  if (providersLoading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">{t('form.loadingProviders')}</div>;
  }

  if (!providers || providers.length === 0) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {t('form.noProviders')}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label={isEditing ? t('form.editTitle') : t('form.createTitle')}>
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {apiError}
        </div>
      )}

      {!isEditing && (
        <div>
          <label htmlFor="bf-provider" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('form.provider')}
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            id="bf-provider"
            className="input w-full"
            value={providerName}
            onChange={(e) => {
              setProviderName(e.target.value);
              setConfig({});
              setCredentials({});
            }}
            required
          >
            {providers.map((p) => (
              <option key={p.name} value={p.name}>
                {p.displayName}
              </option>
            ))}
          </select>
          {selectedProvider?.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedProvider.description}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="bf-displayName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('form.displayName')}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          id="bf-displayName"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('form.displayNamePlaceholder')}
          className="input w-full"
        />
      </div>

      {!isEditing && selectedProvider && (
        <>
          {selectedProvider.configSchema.fields.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('form.configSection')}</h3>
              {selectedProvider.configSchema.fields.map((f) =>
                renderField(f, config[f.name] ?? '', handleConfigChange),
              )}
            </div>
          )}
          {selectedProvider.credentialSchema.fields.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('form.credentialsSection')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('form.credentialsHint')}</p>
              {selectedProvider.credentialSchema.fields.map((f) =>
                renderField(f, credentials[f.name] ?? '', handleCredentialChange),
              )}
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('form.scheduleSection')}</h3>
        <div>
          <label htmlFor="bf-schedule" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('form.schedule')}
          </label>
          <select
            id="bf-schedule"
            className="input w-full"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as BackupSchedule)}
          >
            {SCHEDULES.map((s) => (
              <option key={s} value={s}>
                {t(`schedule.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {schedule !== 'manual' && (
          <div>
            <label htmlFor="bf-hour" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('form.scheduleHour')}
            </label>
            <input
              id="bf-hour"
              type="number"
              min={0}
              max={23}
              value={scheduleHourUtc}
              onChange={(e) => setScheduleHourUtc(Number(e.target.value))}
              className="input w-full"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('form.scheduleHourHint')}</p>
          </div>
        )}

        {schedule === 'weekly' && (
          <div>
            <label htmlFor="bf-dow" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('form.scheduleDayOfWeek')}
            </label>
            <select
              id="bf-dow"
              className="input w-full"
              value={scheduleDayOfWeek}
              onChange={(e) => setScheduleDayOfWeek(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {t(`days.${d}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        {schedule === 'monthly' && (
          <div>
            <label htmlFor="bf-dom" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('form.scheduleDayOfMonth')}
            </label>
            <input
              id="bf-dom"
              type="number"
              min={1}
              max={28}
              value={scheduleDayOfMonth}
              onChange={(e) => setScheduleDayOfMonth(Number(e.target.value))}
              className="input w-full"
            />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="bf-retention" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('form.retention')}
        </label>
        <input
          id="bf-retention"
          type="number"
          min={0}
          value={retentionCount}
          onChange={(e) => setRetentionCount(Number(e.target.value))}
          className="input w-full"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('form.retentionHint')}</p>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-slate-700 dark:text-slate-300">{t('form.enabled')}</span>
      </label>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <button type="button" onClick={onClose} className="btn-ghost">
          {t('form.cancel')}
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? t('form.saving') : isEditing ? t('form.save') : t('form.create')}
        </button>
      </div>
    </form>
  );
}
