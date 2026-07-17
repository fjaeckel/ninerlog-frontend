/**
 * Theme-aware help illustrations.
 *
 * Each figure is a real, annotated screenshot of the running app — not a
 * mockup — captured by scripts/help-screenshots/generate.mjs (Playwright
 * drives the real UI against realistic mock data, then bakes a "click here"
 * ring/cursor/step-badge overlay onto the page before saving the PNG). One
 * light and one dark variant lives in public/help/<id>-<theme>.png; this
 * component just picks the file matching the app's *actual* theme toggle
 * (`useTheme().resolvedTheme`), not just the OS `prefers-color-scheme`. That
 * means a user who forces light mode while their OS is dark still sees the
 * light screenshot, and vice-versa.
 *
 * Figures are referenced from the markdown help content with a custom image
 * source, e.g. `![Where to click](figure:add-flight)`. The `HelpFigure`
 * renderer (wired into react-markdown in HelpPage) looks the id up below and
 * renders the matching image with the alt text as a caption. Unknown ids
 * render nothing so content never shows a broken image.
 *
 * To regenerate a screenshot after a UI change: `npm run dev` in one
 * terminal, then `node scripts/help-screenshots/generate.mjs [figure-id...]`
 * in another.
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
 * Renders a help figure by id inside a captioned frame. Built entirely from
 * inline elements (`span`) so it is valid where react-markdown places images
 * (inside a `<p>`). Returns `null` for unknown ids.
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
