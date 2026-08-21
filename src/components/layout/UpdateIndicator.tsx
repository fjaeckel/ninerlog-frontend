import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpCircle, ExternalLink } from 'lucide-react';
import { useUpdateStatus } from '../../hooks/useAdmin';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import type { UpdateComponent } from '../../hooks/useAdmin';

/** Header light that blinks while a NinerLog component is behind its newest release. Admin-only. */
export function UpdateIndicator() {
  const { t } = useTranslation(['common', 'nav']);
  const { fmtDate } = useFormatPrefs();
  const { data } = useUpdateStatus();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node | null)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const branch = data?.branch ?? 'main';
  const behind = data?.updateAvailable
    ? (data.components ?? []).filter((c) => c.state === 'update_available')
    : [];
  if (behind.length === 0) return null;

  const componentLabel = (component: UpdateComponent) =>
    component.name === 'api' ? t('common:admin.update.componentApi') : t('common:admin.update.componentFrontend');

  return (
    <div
      ref={wrapper}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('common:admin.update.available')}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-11 h-11 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors tap-none"
      >
        <span className="relative flex w-2.5 h-2.5" aria-hidden="true">
          <span className="absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        </span>
      </button>

      {open && (
        <div
          role="status"
          className="fixed inset-x-4 top-[calc(3.5rem+env(safe-area-inset-top))] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80 rounded-lg border border-amber-200 bg-white p-4 shadow-lg dark:border-amber-800 dark:bg-slate-800 animate-fade-in"
        >
          <div className="flex items-start gap-2.5">
            <ArrowUpCircle className="mt-0.5 w-5 h-5 shrink-0 text-amber-500" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t('common:admin.update.available')}
              </h3>

              <ul className="mt-2 space-y-2">
                {behind.map((component) => (
                  <li key={component.name} className="text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {componentLabel(component)}
                      </span>
                      {' — '}
                      {component.channel === 'commit' ? (
                        t('common:admin.update.commitsBehind', { count: component.behindBy ?? 0, branch })
                      ) : (
                        <>
                          <span className="font-mono">
                            {component.currentVersion || '—'} → {component.latestVersion}
                          </span>
                          {component.publishedAt && (
                            <span className="text-slate-500 dark:text-slate-400">
                              {' '}
                              {t('common:admin.update.publishedOn', { date: fmtDate(component.publishedAt) })}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {component.channel === 'commit'
                      ? component.compareUrl && (
                          <a
                            href={component.compareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 py-3.5 -my-3.5 font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {t('common:admin.update.viewChanges')}
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )
                      : component.releaseUrl && (
                          <a
                            href={component.releaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 py-3.5 -my-3.5 font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {t('common:admin.update.releaseNotes')}
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                  </li>
                ))}
              </ul>

              <div className="mt-3">
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="inline-block py-3.5 -my-3.5 text-xs font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('common:admin.update.viewInAdmin')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
