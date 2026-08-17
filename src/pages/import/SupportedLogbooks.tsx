import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useImportTemplates } from '../../hooks/useImport';
import type { ImportTemplate } from '../../hooks/useImport';

/**
 * The "coming from another logbook?" panel on the import screen.
 *
 * Picking a logbook here does not change how the file is parsed — the server
 * detects the format from the header row either way. What it does is answer the
 * question that actually blocks a migration: *how do I get my flights out of
 * the app I'm using now?* So selecting an entry reveals that app's export
 * steps, and nothing else.
 *
 * Template names, descriptions and export steps come from the server catalogue
 * and are currently English-only; the surrounding chrome is translated.
 */
export default function SupportedLogbooks() {
  const { t } = useTranslation('import');
  const { data: templates, isLoading, isError } = useImportTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="card">
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-28 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // The catalogue is a convenience, not a prerequisite — uploading works
  // without it, so a failed fetch stays silent rather than showing an error
  // the pilot cannot act on.
  if (isError || !templates?.length) return null;

  const selected = templates.find((tpl) => tpl.id === selectedId) ?? null;

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {t('supportedLogbooksTitle', 'Coming from another logbook?')}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
        {t(
          'supportedLogbooksSubtitle',
          'Pick the app you use today to see how to export from it. Your file format is detected automatically — you never have to choose one here.',
        )}
      </p>

      {/* The list semantics live on the ul/li, not on the buttons. An earlier
          version put role="listitem" on the button itself, which overrides the
          implicit button role: assistive technology announced each logbook as a
          list item rather than something you can press. */}
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {templates.map((tpl) => {
          const isSelected = tpl.id === selectedId;
          return (
            <li key={tpl.id}>
              <button
                type="button"
                aria-expanded={isSelected}
                onClick={() => setSelectedId(isSelected ? null : tpl.id)}
                className={`px-3 py-2 min-h-[44px] rounded-full border text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                }`}
              >
                {tpl.name}
              </button>
            </li>
          );
        })}
      </ul>

      {selected && <LogbookExportSteps template={selected} />}
    </div>
  );
}

function LogbookExportSteps({ template }: { template: ImportTemplate }) {
  const { t } = useTranslation('import');

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t('exportFromTitle', 'Exporting from {{name}}', { name: template.name })}
        </h3>
        {template.regions.map((region) => (
          <span
            key={region}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {region}
          </span>
        ))}
        {!template.autoDetected && (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {t('manualMappingBadge', 'Manual mapping')}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{template.description}</p>

      <ol className="space-y-2 mb-3">
        {template.exportSteps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center font-medium">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {template.confidence === 'best-effort' && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t(
            'bestEffortNote',
            'Column names vary between versions of this app. Anything not recognised automatically is left for you to map in the next step — nothing is imported before you have reviewed the preview.',
          )}
        </p>
      )}

      {template.website && (
        <a
          href={template.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t('vendorWebsite', 'Open {{name}} ↗', { name: template.name })}
        </a>
      )}
    </div>
  );
}
