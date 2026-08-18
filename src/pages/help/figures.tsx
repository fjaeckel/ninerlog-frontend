/**
 * Theme-aware help illustrations: annotated screenshots captured by
 * scripts/help-screenshots/generate.mjs, one light and one dark variant in
 * public/help/<id>-<theme>.png, picked by `useTheme().resolvedTheme`.
 * Referenced from markdown help content as `![alt](figure:<id>)`; unknown
 * ids render nothing. Regenerate: `npm run dev`, then
 * `node scripts/help-screenshots/generate.mjs [figure-id...]`.
 */
import { useTheme } from '../../hooks/useTheme';

const FIGURE_IDS = [
  'nav-overview',
  'theme-toggle',
  'add-flight',
  'flight-form',
  'flight-search',
  'quicklog',
  'add-aircraft',
  'currency-status',
  'add-license',
  'credentials-status',
  'signature-section',
  'import-steps',
  'reports-overview',
  'profile-tabs',
  'dashboard-overview',
];

const FIGURE_ID_SET = new Set(FIGURE_IDS);

/**
 * Renders a help figure by id inside a captioned frame, built entirely from
 * inline elements (`span`). Returns `null` for unknown ids.
 */
export function HelpFigure({ id, caption }: { id: string; caption?: string }) {
  const { resolvedTheme } = useTheme();
  if (!FIGURE_ID_SET.has(id)) return null;

  return (
    <span className="my-6 block not-prose">
      <span className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
        <img
          src={`/help/${id}-${resolvedTheme}.png`}
          alt={caption || 'NinerLog screenshot'}
          className="w-full h-auto rounded-lg"
        />
      </span>
      {caption && (
        <span className="mt-2 block text-center text-xs text-slate-500 dark:text-slate-400">{caption}</span>
      )}
    </span>
  );
}
