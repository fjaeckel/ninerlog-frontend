import { useEffect, useState } from 'react';

/**
 * Chart palette for the Reports page.
 *
 * Both columns are selected, not flipped: the dark steps are the same hues
 * re-stepped for the dark card surface (slate-800). The three categorical
 * slots are validated against this app's real surfaces (#ffffff light,
 * #1e293b dark) for the lightness band, chroma floor, colour-vision
 * separation and normal-vision separation across every pair.
 *
 * Only three categorical slots exist on purpose. The one place the page
 * shows distinct series at once is the PIC / SIC / Dual split, which is a
 * true part-to-whole under EASA (every flight is exactly one of the three).
 * Everything else is a single-hue magnitude comparison, so it uses `accent`.
 * If a fourth series is ever needed, fold the tail into "Other" rather than
 * inventing a hue.
 */
export interface ChartTheme {
  dark: boolean;
  /** Categorical slots, in fixed assignment order. Never cycle past these. */
  series: [string, string, string];
  /** Single-hue default for magnitude comparisons (bars, histograms). */
  accent: string;
  /** De-emphasised companion for context marks behind the accent. */
  muted: string;
  /** Chart chrome. */
  grid: string;
  axis: string;
  tick: string;
  /** Card surface — used for the 2px gaps and rings that separate marks. */
  surface: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const LIGHT: ChartTheme = {
  dark: false,
  series: ['#2a78d6', '#eb6834', '#1baf7a'],
  accent: '#2a78d6',
  muted: '#cbd5e1',
  grid: '#e2e8f0',
  axis: '#cbd5e1',
  tick: '#64748b',
  surface: '#ffffff',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0',
  tooltipText: '#0f172a',
};

const DARK: ChartTheme = {
  dark: true,
  series: ['#3987e5', '#d95926', '#199e70'],
  accent: '#3987e5',
  muted: '#475569',
  grid: '#334155',
  axis: '#475569',
  tick: '#94a3b8',
  surface: '#1e293b',
  tooltipBg: '#0f172a',
  tooltipBorder: '#334155',
  tooltipText: '#f8fafc',
};

/**
 * Tracks the resolved colour scheme by observing the `dark` class the theme
 * store stamps on <html>. Watching the DOM rather than the store means the
 * charts stay correct for the "system" setting and for any theme change made
 * outside React.
 */
export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark ? DARK : LIGHT;
}

/** Shared recharts tooltip styling. */
export function tooltipStyles(theme: ChartTheme) {
  return {
    contentStyle: {
      backgroundColor: theme.tooltipBg,
      border: `1px solid ${theme.tooltipBorder}`,
      borderRadius: '8px',
      color: theme.tooltipText,
      fontSize: '13px',
      boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)',
      padding: '8px 10px',
    },
    labelStyle: { color: theme.tooltipText, fontWeight: 600, marginBottom: 2 },
    itemStyle: { color: theme.tooltipText, padding: 0 },
    cursor: { fill: theme.dark ? 'rgb(148 163 184 / 0.12)' : 'rgb(15 23 42 / 0.05)' },
  };
}
