import { useTranslation } from 'react-i18next';
import { ArrowUpCircle, ExternalLink } from 'lucide-react';
import { useUpdateStatus } from '../../hooks/useAdmin';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import type { UpdateComponent } from '../../hooks/useAdmin';

function useComponentLabel() {
  const { t } = useTranslation('common');
  return (component: UpdateComponent) =>
    component.name === 'api' ? t('admin.update.componentApi') : t('admin.update.componentFrontend');
}

/** Banner shown across every admin tab while a component is behind its newest release. */
export function UpdateBanner() {
  const { t } = useTranslation('common');
  const { fmtDate } = useFormatPrefs();
  const componentLabel = useComponentLabel();
  const { data } = useUpdateStatus();
  const branch = data?.branch ?? 'main';

  const behind = data?.updateAvailable
    ? (data.components ?? []).filter((c) => c.state === 'update_available')
    : [];
  if (behind.length === 0) return null;

  return (
    <div
      role="status"
      aria-label={t('admin.update.available')}
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
    >
      <div className="flex items-start gap-3">
        <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {t('admin.update.available')}
          </h3>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
            {t('admin.update.availableHint')}
          </p>

          <ul className="mt-3 space-y-1.5">
            {behind.map((component) => (
              <li key={component.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  {componentLabel(component)}
                </span>
                {component.channel === 'commit' ? (
                  <>
                    <span className="font-mono text-xs text-amber-800/80 dark:text-amber-200/80">
                      {component.currentCommit}
                    </span>
                    <span className="text-xs text-amber-800/90 dark:text-amber-200/90">
                      {t('admin.update.commitsBehind', { count: component.behindBy ?? 0, branch })}
                    </span>
                    {component.compareUrl && (
                      <a
                        href={component.compareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                      >
                        {t('admin.update.viewChanges')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-mono text-xs text-amber-800/80 dark:text-amber-200/80">
                      {component.currentVersion || '—'} → {component.latestVersion}
                    </span>
                    {component.publishedAt && (
                      <span className="text-xs text-amber-700/80 dark:text-amber-300/80">
                        {t('admin.update.publishedOn', { date: fmtDate(component.publishedAt) })}
                      </span>
                    )}
                    {component.releaseUrl && (
                      <a
                        href={component.releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                      >
                        {t('admin.update.releaseNotes')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-3 font-mono text-xs text-amber-800/80 dark:text-amber-200/80">
            {t('admin.update.upgradeCommand')}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Per-component release state for the config tab, shown whether or not an update is due. */
export function UpdateStatusCard() {
  const { t } = useTranslation('common');
  const { fmtDateTime } = useFormatPrefs();
  const componentLabel = useComponentLabel();
  const { data, isLoading } = useUpdateStatus();
  const branch = data?.branch ?? 'main';

  if (isLoading) {
    return (
      <div className="card mt-6">
        <div className="text-sm text-slate-500 dark:text-slate-400">{t('admin.update.loading')}</div>
      </div>
    );
  }
  if (!data) return null;

  const stateCell = (component: UpdateComponent) => {
    if (component.state === 'update_available') {
      return (
        <span className="font-medium text-amber-600 dark:text-amber-400">
          {component.channel === 'commit'
            ? t('admin.update.commitsBehind', { count: component.behindBy ?? 0, branch })
            : t('admin.update.stateUpdateAvailable', { version: component.latestVersion })}
        </span>
      );
    }
    if (component.state === 'up_to_date') {
      return (
        <span className="font-medium text-green-600 dark:text-green-400">
          {component.channel === 'commit'
            ? t('admin.update.stateOnBranch', { branch })
            : t('admin.update.stateUpToDate')}
        </span>
      );
    }
    return <span className="text-slate-500 dark:text-slate-400">{t('admin.update.stateUnknown')}</span>;
  };

  return (
    <div className="card mt-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
        {t('admin.update.title')}
      </h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        {data.checkEnabled ? t('admin.update.subtitle', { branch }) : t('admin.update.subtitleDisabled')}
      </p>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {(data.components ?? []).map((component) => (
          <div key={component.name} className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{componentLabel(component)}</span>
            <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm">
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {component.channel === 'commit' && component.currentCommit
                  ? component.currentCommit
                  : component.currentVersion || '—'}
              </span>
              {stateCell(component)}
              {component.state === 'update_available' && component.channel === 'commit' && component.compareUrl && (
                <a
                  href={component.compareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('admin.update.viewChanges')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {component.state === 'update_available' && component.channel !== 'commit' && component.releaseUrl && (
                <a
                  href={component.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('admin.update.releaseNotes')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </span>
          </div>
        ))}

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('admin.update.lastChecked')}</span>
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {data.lastCheckedAt ? fmtDateTime(data.lastCheckedAt) : <span className="text-slate-500 dark:text-slate-400">{'—'}</span>}
          </span>
        </div>

        {data.lastError && (
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{t('admin.update.lastError')}</span>
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {t(`admin.update.error.${data.lastError}`)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
