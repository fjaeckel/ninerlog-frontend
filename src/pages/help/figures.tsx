/**
 * Theme-aware help illustrations.
 *
 * Each figure is an inline-SVG React component drawn from a palette that
 * follows the app's *actual* theme toggle (`useTheme().resolvedTheme`), not
 * just the OS `prefers-color-scheme`. That means a user who forces light mode
 * while their OS is dark still sees the light illustration, and vice-versa.
 *
 * Figures are referenced from the markdown help content with a custom image
 * source, e.g. `![Where to click](figure:add-flight)`. The `HelpFigure`
 * renderer (wired into react-markdown in HelpPage) looks the id up in
 * `helpFigures` and renders the matching component with the alt text as a
 * caption. Unknown ids render nothing so content never shows a broken image.
 */
import { useMemo, type ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface Palette {
  frame: string;      // page / viewport background
  panel: string;      // sidebar / secondary surface
  card: string;       // raised card surface
  border: string;     // hairline borders
  text: string;       // primary text
  muted: string;      // secondary text / placeholders
  accent: string;     // brand blue (buttons, active nav)
  accentBg: string;   // tinted brand background
  accentText: string; // text on an accent button
  mark: string;       // "click here" highlight (amber)
  markBg: string;     // amber tint
  green: string;
  amber: string;
  red: string;
}

const LIGHT: Palette = {
  frame: '#ffffff',
  panel: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#334155',
  muted: '#94a3b8',
  accent: '#2563eb',
  accentBg: '#eff6ff',
  accentText: '#ffffff',
  mark: '#d97706',
  markBg: 'rgba(245, 158, 11, 0.14)',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
};

const DARK: Palette = {
  frame: '#0f172a',
  panel: '#1e293b',
  card: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  muted: '#64748b',
  accent: '#60a5fa',
  accentBg: 'rgba(37, 99, 235, 0.22)',
  accentText: '#0f172a',
  mark: '#fbbf24',
  markBg: 'rgba(251, 191, 36, 0.16)',
  green: '#4ade80',
  amber: '#fbbf24',
  red: '#f87171',
};

/* ------------------------------------------------------------------ */
/* Shared SVG helpers                                                  */
/* ------------------------------------------------------------------ */

/** Dashed "click here" ring that gently pulses to draw the eye. */
function Ring({ x, y, w, h, p }: { x: number; y: number; w: number; h: number; p: Palette }) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx={9}
        fill="none" stroke={p.mark} strokeWidth={2.5} strokeDasharray="6 5"
      >
        <animate attributeName="stroke-opacity" values="1;0.35;1" dur="2.2s" repeatCount="indefinite" />
      </rect>
    </g>
  );
}

/** Numbered step badge. */
function Step({ x, y, n, p }: { x: number; y: number; n: number; p: Palette }) {
  return (
    <g>
      <circle cx={x} cy={y} r={12} fill={p.mark} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#ffffff">{n}</text>
    </g>
  );
}

/** A mouse cursor pointing at a target. */
function Cursor({ x, y, p }: { x: number; y: number; p: Palette }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L0 18 L4.5 13.5 L7.5 20 L10 19 L7 12.5 L13 12.5 Z"
        fill={p.text} stroke="#ffffff" strokeWidth={1.2} strokeLinejoin="round" />
    </g>
  );
}

function Pill({ x, y, w, label, fill, text }: { x: number; y: number; w: number; label: string; fill: string; text: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={20} rx={10} fill={fill} />
      <text x={x + w / 2} y={y + 14} textAnchor="middle" fontSize={11} fontWeight={600} fill={text}>{label}</text>
    </g>
  );
}

const FONT = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

type Fig = (p: Palette) => ReactNode;

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

/** Master map of the left navigation so users can find every feature. */
const navOverview: Fig = (p) => {
  const items = [
    { label: 'Dashboard', y: 78 },
    { label: 'Flights', y: 108 },
    { label: 'Quick Log', y: 138 },
    { label: 'Aircraft', y: 168 },
    { label: 'Currency', y: 198 },
    { label: 'Licenses', y: 228 },
    { label: 'Credentials', y: 258 },
    { label: 'Reports · Map', y: 288 },
    { label: 'Import · Export', y: 318 },
  ];
  return (
    <svg viewBox="0 0 640 380" className="w-full h-auto" role="img" fontFamily={FONT}>
      <rect x={0} y={0} width={640} height={380} rx={12} fill={p.frame} stroke={p.border} />
      {/* sidebar */}
      <rect x={0} y={0} width={230} height={380} rx={12} fill={p.panel} />
      <rect x={218} y={0} width={12} height={380} fill={p.panel} />
      {/* brand */}
      <circle cx={30} cy={34} r={11} fill={p.accent} />
      <text x={50} y={39} fontSize={16} fontWeight={700} fill={p.text}>NinerLog</text>
      {/* add flight button */}
      <rect x={20} y={54} width={190} height={0} />
      {items.map((it, i) => (
        <g key={it.label}>
          {i === 1 && <rect x={12} y={it.y - 15} width={206} height={26} rx={7} fill={p.accentBg} />}
          <circle cx={30} cy={it.y - 2} r={6} fill={i === 1 ? p.accent : p.muted} />
          <text x={50} y={it.y + 2} fontSize={13} fontWeight={i === 1 ? 700 : 500}
            fill={i === 1 ? p.accent : p.text}>{it.label}</text>
        </g>
      ))}
      {/* bottom items */}
      <line x1={12} y1={342} x2={218} y2={342} stroke={p.border} />
      <text x={50} y={362} fontSize={13} fontWeight={500} fill={p.text}>Help · Profile</text>
      <circle cx={30} cy={358} r={6} fill={p.muted} />

      {/* content preview */}
      <text x={262} y={44} fontSize={15} fontWeight={700} fill={p.text}>Your logbook, one click away</text>
      <text x={262} y={70} fontSize={12} fill={p.muted}>The left menu is your map to every</text>
      <text x={262} y={88} fontSize={12} fill={p.muted}>feature. Tap an item to open it.</text>
      <rect x={262} y={110} width={352} height={230} rx={10} fill={p.card} stroke={p.border} />
      <text x={282} y={150} fontSize={12} fill={p.muted}>Selected section appears here →</text>
    </svg>
  );
};

/** Appearance / theme switcher inside Profile → Preferences. */
const themeToggle: Fig = (p) => (
  <svg viewBox="0 0 640 220" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={220} rx={12} fill={p.frame} stroke={p.border} />
    <text x={40} y={44} fontSize={15} fontWeight={700} fill={p.text}>Preferences</text>
    <text x={40} y={78} fontSize={13} fontWeight={600} fill={p.text}>Appearance</text>
    {/* segmented control */}
    <rect x={40} y={96} width={300} height={44} rx={10} fill={p.panel} stroke={p.border} />
    {[
      { label: 'Light', active: true, x: 40 },
      { label: 'Dark', active: false, x: 140 },
      { label: 'System', active: false, x: 240 },
    ].map((seg) => (
      <g key={seg.label}>
        {seg.active && <rect x={seg.x + 6} y={102} width={88} height={32} rx={7} fill={p.accent} />}
        <text x={seg.x + 50} y={123} textAnchor="middle" fontSize={13} fontWeight={600}
          fill={seg.active ? p.accentText : p.text}>{seg.label}</text>
      </g>
    ))}
    <Ring x={132} y={92} w={200} h={52} p={p} />
    <Cursor x={228} y={132} p={p} />
    <text x={370} y={124} fontSize={12} fill={p.muted}>Light / Dark / System —</text>
    <text x={370} y={142} fontSize={12} fill={p.muted}>the whole app follows instantly.</text>
  </svg>
);

/** Flights list with the Add-Flight (+) button highlighted. */
const addFlight: Fig = (p) => (
  <svg viewBox="0 0 640 300" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={300} rx={12} fill={p.frame} stroke={p.border} />
    <text x={28} y={44} fontSize={17} fontWeight={700} fill={p.text}>Flights</text>
    {/* add button */}
    <rect x={468} y={24} width={148} height={38} rx={9} fill={p.accent} />
    <text x={498} y={48} fontSize={14} fontWeight={700} fill={p.accentText}>+  Add Flight</text>
    <Ring x={462} y={18} w={160} h={50} p={p} />
    <Cursor x={556} y={54} p={p} />
    {/* search bar */}
    <rect x={28} y={80} width={588} height={34} rx={8} fill={p.panel} stroke={p.border} />
    <text x={44} y={102} fontSize={12} fill={p.muted}>Search flights…</text>
    {/* flight rows */}
    {[140, 186, 232].map((y, i) => (
      <g key={y}>
        <rect x={28} y={y} width={588} height={38} rx={8} fill={p.card} stroke={p.border} />
        <text x={44} y={y + 17} fontSize={12} fontWeight={700} fill={p.text}>2026-0{7 - i}-1{i}</text>
        <text x={44} y={y + 31} fontSize={11} fill={p.muted}>EDDF → EDDH</text>
        <text x={520} y={y + 24} fontSize={12} fontWeight={600} fill={p.text} fontFamily={MONO}>1:{20 + i}0</text>
      </g>
    ))}
  </svg>
);

/** The flight form, showing which sections are always-open vs collapsible. */
const flightForm: Fig = (p) => (
  <svg viewBox="0 0 640 360" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={360} rx={12} fill={p.frame} stroke={p.border} />
    <text x={28} y={40} fontSize={16} fontWeight={700} fill={p.text}>New Flight</text>
    {/* Basic block */}
    <rect x={28} y={56} width={584} height={70} rx={9} fill={p.card} stroke={p.border} />
    <text x={44} y={78} fontSize={12} fontWeight={700} fill={p.text}>Basic · always open</text>
    <rect x={44} y={90} width={150} height={24} rx={6} fill={p.panel} stroke={p.border} />
    <rect x={206} y={90} width={150} height={24} rx={6} fill={p.panel} stroke={p.border} />
    <rect x={368} y={90} width={100} height={24} rx={6} fill={p.panel} stroke={p.border} />
    <rect x={480} y={90} width={116} height={24} rx={6} fill={p.panel} stroke={p.border} />
    <text x={52} y={106} fontSize={10} fill={p.muted}>Date</text>
    <text x={214} y={106} fontSize={10} fill={p.muted}>Aircraft</text>
    <text x={376} y={106} fontSize={10} fill={p.muted}>From</text>
    <text x={488} y={106} fontSize={10} fill={p.muted}>To</text>
    {/* Crew block highlighted */}
    <rect x={28} y={136} width={584} height={70} rx={9} fill={p.accentBg} stroke={p.accent} />
    <text x={44} y={158} fontSize={12} fontWeight={700} fill={p.accent}>Crew · the single source of truth for who is aboard</text>
    <Pill x={44} y={170} w={120} label="John Doe · SIC" fill={p.card} text={p.text} />
    <Pill x={176} y={170} w={110} label="+ Add crew" fill={p.accent} text={p.accentText} />
    <Ring x={22} y={130} w={596} h={82} p={p} />
    {/* collapsed drawers */}
    {[
      { label: 'Route & Times', y: 218 },
      { label: 'Landings & Takeoffs', y: 256 },
      { label: 'Instrument / IFR  ▸  (tap to expand)', y: 294 },
      { label: 'Training & Currency  ▸  (tap to expand)', y: 332 },
    ].map((d) => (
      <g key={d.label}>
        <rect x={28} y={d.y - 20} width={584} height={30} rx={8} fill={p.panel} stroke={p.border} />
        <text x={44} y={d.y} fontSize={12} fontWeight={600} fill={p.text}>{d.label}</text>
      </g>
    ))}
  </svg>
);

/** Flights search bar with the syntax-help toggle. */
const flightSearch: Fig = (p) => (
  <svg viewBox="0 0 640 250" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={250} rx={12} fill={p.frame} stroke={p.border} />
    <rect x={28} y={26} width={548} height={38} rx={9} fill={p.panel} stroke={p.border} />
    <text x={44} y={50} fontSize={13} fill={p.text} fontFamily={MONO}>from:EDDF night&gt;0</text>
    {/* help toggle */}
    <circle cx={598} cy={45} r={16} fill={p.accentBg} stroke={p.accent} />
    <text x={598} y={50} textAnchor="middle" fontSize={15} fontWeight={700} fill={p.accent}>?</text>
    <Ring x={578} y={27} w={40} h={38} p={p} />
    <Cursor x={606} y={54} p={p} />
    {/* dropdown of tags */}
    <rect x={28} y={78} width={548} height={150} rx={10} fill={p.card} stroke={p.border} />
    <text x={44} y={102} fontSize={12} fontWeight={700} fill={p.text}>Filter tags — combine with AND / OR / -not</text>
    {[
      { t: 'from:', d: 'departure ICAO', y: 128 },
      { t: 'to:', d: 'arrival ICAO', y: 152 },
      { t: 'reg:', d: 'aircraft registration', y: 176 },
      { t: 'crew:', d: 'crew member name', y: 200 },
    ].map((row) => (
      <g key={row.t}>
        <rect x={44} y={row.y - 14} width={70} height={20} rx={5} fill={p.panel} stroke={p.border} />
        <text x={52} y={row.y} fontSize={11} fontWeight={700} fill={p.accent} fontFamily={MONO}>{row.t}</text>
        <text x={128} y={row.y} fontSize={11} fill={p.muted}>{row.d}</text>
      </g>
    ))}
    <text x={330} y={128} fontSize={11} fill={p.muted} fontFamily={MONO}>night&gt;0</text>
    <text x={330} y={152} fontSize={11} fill={p.muted} fontFamily={MONO}>ifr&gt;0</text>
    <text x={330} y={176} fontSize={11} fill={p.muted} fontFamily={MONO}>date:2026-05</text>
    <text x={330} y={200} fontSize={11} fill={p.muted} fontFamily={MONO}>totalTime&gt;1:30</text>
  </svg>
);

/** Quick Log big tap targets. */
const quicklog: Fig = (p) => (
  <svg viewBox="0 0 640 300" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={300} rx={12} fill={p.frame} stroke={p.border} />
    <text x={28} y={42} fontSize={16} fontWeight={700} fill={p.text}>Quick Log</text>
    <text x={28} y={64} fontSize={12} fill={p.muted}>One-tap block timing — perfect on your phone in the cockpit.</text>
    {/* aircraft selector */}
    <rect x={28} y={80} width={584} height={34} rx={8} fill={p.panel} stroke={p.border} />
    <text x={44} y={102} fontSize={12} fill={p.text}>Aircraft:  D-EABC ▾</text>
    {/* Off-block big button */}
    <rect x={28} y={128} width={282} height={120} rx={14} fill={p.accent} />
    <text x={169} y={180} textAnchor="middle" fontSize={18} fontWeight={800} fill={p.accentText}>OFF-BLOCK</text>
    <text x={169} y={206} textAnchor="middle" fontSize={12} fill={p.accentText}>tap when chocks come out</text>
    <Ring x={22} y={122} w={294} h={132} p={p} />
    <Cursor x={150} y={196} p={p} />
    {/* On-block big button */}
    <rect x={330} y={128} width={282} height={120} rx={14} fill={p.panel} stroke={p.border} />
    <text x={471} y={180} textAnchor="middle" fontSize={18} fontWeight={800} fill={p.text}>ON-BLOCK</text>
    <text x={471} y={206} textAnchor="middle" fontSize={12} fill={p.muted}>tap when you shut down</text>
    <text x={28} y={278} fontSize={11} fill={p.muted}>Works offline — taps sync automatically when you regain signal.</text>
  </svg>
);

/** Aircraft list with Add Aircraft button. */
const addAircraft: Fig = (p) => (
  <svg viewBox="0 0 640 280" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={280} rx={12} fill={p.frame} stroke={p.border} />
    <text x={28} y={44} fontSize={17} fontWeight={700} fill={p.text}>Aircraft</text>
    <rect x={452} y={24} width={164} height={38} rx={9} fill={p.accent} />
    <text x={480} y={48} fontSize={14} fontWeight={700} fill={p.accentText}>+  Add Aircraft</text>
    <Ring x={446} y={18} w={176} h={50} p={p} />
    <Cursor x={548} y={54} p={p} />
    {[
      { reg: 'D-EABC', type: 'C172 · SEP Land', y: 88 },
      { reg: 'D-GXYZ', type: 'PA34 · MEP Land', y: 152 },
      { reg: 'N12345', type: 'DA42 · MEP Land', y: 216 },
    ].map((a) => (
      <g key={a.reg}>
        <rect x={28} y={a.y} width={588} height={48} rx={9} fill={p.card} stroke={p.border} />
        <rect x={40} y={a.y + 12} width={24} height={24} rx={6} fill={p.accentBg} />
        <text x={80} y={a.y + 22} fontSize={13} fontWeight={700} fill={p.text} fontFamily={MONO}>{a.reg}</text>
        <text x={80} y={a.y + 38} fontSize={11} fill={p.muted}>{a.type}</text>
        <text x={584} y={a.y + 30} textAnchor="end" fontSize={12} fill={p.accent}>Edit ›</text>
      </g>
    ))}
  </svg>
);

/** Currency status cards traffic-light. */
const currencyStatus: Fig = (p) => {
  const cards = [
    { label: 'SEP Land', status: 'Current', color: p.green, sub: 'Valid until 2027-03', dot: p.green },
    { label: 'MEP Land', status: 'Attention', color: p.amber, sub: 'Revalidation due in 41 days', dot: p.amber },
    { label: 'Instrument (IR)', status: 'Not current', color: p.red, sub: '6 approaches needed', dot: p.red },
  ];
  return (
    <svg viewBox="0 0 640 250" className="w-full h-auto" role="img" fontFamily={FONT}>
      <rect x={0} y={0} width={640} height={250} rx={12} fill={p.frame} stroke={p.border} />
      <text x={28} y={40} fontSize={16} fontWeight={700} fill={p.text}>Currency</text>
      <text x={28} y={62} fontSize={12} fill={p.muted}>Green = current · Amber = attention soon · Red = action required</text>
      {cards.map((c, i) => {
        const y = 84 + i * 52;
        return (
          <g key={c.label}>
            <rect x={28} y={y} width={584} height={44} rx={9} fill={p.card} stroke={p.border} />
            <rect x={28} y={y} width={5} height={44} rx={2.5} fill={c.color} />
            <circle cx={52} cy={y + 22} r={7} fill={c.dot} />
            <text x={72} y={y + 20} fontSize={13} fontWeight={700} fill={p.text}>{c.label}</text>
            <text x={72} y={y + 36} fontSize={11} fill={p.muted}>{c.sub}</text>
            <Pill x={470} y={y + 12} w={130} label={c.status} fill={c.color} text="#ffffff" />
          </g>
        );
      })}
    </svg>
  );
};

/** Licenses page: Add License + Add Rating. */
const addLicense: Fig = (p) => (
  <svg viewBox="0 0 640 280" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={280} rx={12} fill={p.frame} stroke={p.border} />
    <text x={28} y={44} fontSize={17} fontWeight={700} fill={p.text}>Licenses</text>
    <rect x={462} y={24} width={154} height={38} rx={9} fill={p.accent} />
    <text x={488} y={48} fontSize={14} fontWeight={700} fill={p.accentText}>+  Add License</text>
    <Step x={44} y={100} n={1} p={p} />
    <Step x={44} y={200} n={2} p={p} />
    {/* license card */}
    <rect x={68} y={80} width={548} height={170} rx={10} fill={p.card} stroke={p.border} />
    <text x={88} y={110} fontSize={14} fontWeight={700} fill={p.text}>EASA · PPL(A)</text>
    <text x={88} y={130} fontSize={11} fill={p.muted}>No. DE.FCL.12345 — a licence never expires</text>
    <line x1={88} y1={146} x2={596} y2={146} stroke={p.border} />
    <text x={88} y={168} fontSize={12} fontWeight={700} fill={p.text}>Class &amp; type ratings</text>
    <Pill x={88} y={182} w={110} label="SEP Land · 2027" fill={p.accentBg} text={p.accent} />
    <Pill x={208} y={182} w={80} label="IR · 2026" fill={p.accentBg} text={p.accent} />
    {/* add rating button */}
    <rect x={470} y={178} width={126} height={30} rx={8} fill={p.panel} stroke={p.accent} />
    <text x={533} y={198} textAnchor="middle" fontSize={12} fontWeight={700} fill={p.accent}>+ Add Rating</text>
    <Ring x={464} y={173} w={138} h={40} p={p} />
    <text x={88} y={230} fontSize={11} fill={p.muted}>Ratings carry the expiry dates — currency is tracked per rating.</text>
  </svg>
);

/** Credentials status badges. */
const credentialsStatus: Fig = (p) => {
  const rows = [
    { label: 'EASA Class 1 Medical', status: 'Valid', color: p.green, sub: 'Expires 2027-01-31' },
    { label: 'ICAO Language Level 5', status: 'Expiring', color: p.amber, sub: 'Expires in 63 days' },
    { label: 'ZÜP Security Clearance', status: 'Expired', color: p.red, sub: 'Expired 2026-05-02' },
  ];
  return (
    <svg viewBox="0 0 640 260" className="w-full h-auto" role="img" fontFamily={FONT}>
      <rect x={0} y={0} width={640} height={260} rx={12} fill={p.frame} stroke={p.border} />
      <text x={28} y={44} fontSize={17} fontWeight={700} fill={p.text}>Credentials</text>
      <rect x={440} y={24} width={176} height={38} rx={9} fill={p.accent} />
      <text x={466} y={48} fontSize={14} fontWeight={700} fill={p.accentText}>+  Add Credential</text>
      {rows.map((r, i) => {
        const y = 82 + i * 54;
        return (
          <g key={r.label}>
            <rect x={28} y={y} width={588} height={46} rx={9} fill={p.card} stroke={p.border} />
            <circle cx={52} cy={y + 23} r={8} fill={r.color} />
            <text x={72} y={y + 20} fontSize={13} fontWeight={700} fill={p.text}>{r.label}</text>
            <text x={72} y={y + 37} fontSize={11} fill={p.muted}>{r.sub}</text>
            <Pill x={488} y={y + 13} w={112} label={r.status} fill={r.color} text="#ffffff" />
          </g>
        );
      })}
    </svg>
  );
};

/** Signature section on a flight, showing the three ways to sign. */
const signatureSection: Fig = (p) => (
  <svg viewBox="0 0 640 250" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={250} rx={12} fill={p.frame} stroke={p.border} />
    <text x={28} y={40} fontSize={15} fontWeight={700} fill={p.text}>Instructor Signature</text>
    <text x={28} y={62} fontSize={12} fill={p.muted}>This flight hasn’t been signed yet. Pick how the instructor signs:</text>
    {[
      { label: 'Sign now', desc: 'instructor is with you', x: 28, accent: true },
      { label: 'Request via email', desc: 'send them a link', x: 226, accent: false },
      { label: 'Get shareable link', desc: 'copy &amp; send yourself', x: 424, accent: false },
    ].map((b) => (
      <g key={b.label}>
        <rect x={b.x} y={82} width={188} height={64} rx={10}
          fill={b.accent ? p.accent : p.panel} stroke={b.accent ? p.accent : p.border} />
        <text x={b.x + 94} y={112} textAnchor="middle" fontSize={13} fontWeight={700}
          fill={b.accent ? p.accentText : p.text}>{b.label}</text>
        <text x={b.x + 94} y={132} textAnchor="middle" fontSize={10}
          fill={b.accent ? p.accentText : p.muted}>{b.desc}</text>
      </g>
    ))}
    <Ring x={22} y={76} w={200} h={76} p={p} />
    {/* signed state note */}
    <rect x={28} y={168} width={588} height={56} rx={10} fill={p.accentBg} stroke={p.border} />
    <text x={44} y={192} fontSize={12} fontWeight={700} fill={p.text}>🔒 Once signed, the flight is locked</text>
    <text x={44} y={210} fontSize={11} fill={p.muted}>Editing requires voiding the signature first (kept in the audit trail).</text>
  </svg>
);

/** Import 5-step flow. */
const importSteps: Fig = (p) => {
  const steps = ['Upload file', 'Auto-detect format', 'Map columns', 'Preview rows', 'Confirm import'];
  return (
    <svg viewBox="0 0 640 210" className="w-full h-auto" role="img" fontFamily={FONT}>
      <rect x={0} y={0} width={640} height={210} rx={12} fill={p.frame} stroke={p.border} />
      <text x={28} y={40} fontSize={16} fontWeight={700} fill={p.text}>Import flights</text>
      {/* drop zone */}
      <rect x={28} y={56} width={584} height={64} rx={12} fill={p.panel} stroke={p.accent} strokeDasharray="7 6" />
      <text x={320} y={84} textAnchor="middle" fontSize={13} fontWeight={700} fill={p.accent}>Drop your ForeFlight or CSV file here</text>
      <text x={320} y={104} textAnchor="middle" fontSize={11} fill={p.muted}>max 10 MB · format detected automatically</text>
      {/* step rail */}
      {steps.map((s, i) => {
        const x = 60 + i * 128;
        return (
          <g key={s}>
            {i < steps.length - 1 && <line x1={x + 12} y1={166} x2={x + 116} y2={166} stroke={p.border} strokeWidth={2} />}
            <Step x={x} y={166} n={i + 1} p={p} />
            <text x={x} y={196} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={p.text}>{s}</text>
          </g>
        );
      })}
    </svg>
  );
};

/** Reports charts overview. */
const reportsOverview: Fig = (p) => (
  <svg viewBox="0 0 640 280" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={280} rx={12} fill={p.frame} stroke={p.border} />
    <text x={28} y={40} fontSize={16} fontWeight={700} fill={p.text}>Reports</text>
    {/* range selector */}
    <rect x={430} y={22} width={182} height={30} rx={8} fill={p.panel} stroke={p.border} />
    {['6m', '12m', '24m'].map((r, i) => (
      <g key={r}>
        {i === 1 && <rect x={430 + i * 60 + 4} y={26} width={52} height={22} rx={6} fill={p.accent} />}
        <text x={430 + i * 60 + 30} y={41} textAnchor="middle" fontSize={11} fontWeight={600}
          fill={i === 1 ? p.accentText : p.text}>{r}</text>
      </g>
    ))}
    {/* area chart */}
    <rect x={28} y={64} width={360} height={190} rx={10} fill={p.card} stroke={p.border} />
    <text x={44} y={86} fontSize={12} fontWeight={700} fill={p.text}>Block hours by month</text>
    <polyline points="44,220 96,200 148,206 200,170 252,182 304,140 356,150"
      fill="none" stroke={p.accent} strokeWidth={2.5} />
    <polygon points="44,220 96,200 148,206 200,170 252,182 304,140 356,150 356,240 44,240"
      fill={p.accentBg} opacity={0.7} />
    {/* bars */}
    <rect x={404} y={64} width={208} height={190} rx={10} fill={p.card} stroke={p.border} />
    <text x={420} y={86} fontSize={12} fontWeight={700} fill={p.text}>Hours by type</text>
    {[
      { l: 'C172', w: 150 }, { l: 'PA28', w: 96 }, { l: 'DA42', w: 128 }, { l: 'SF25', w: 60 },
    ].map((b, i) => (
      <g key={b.l}>
        <text x={420} y={118 + i * 34} fontSize={11} fill={p.muted} fontFamily={MONO}>{b.l}</text>
        <rect x={460} y={106 + i * 34} width={b.w} height={16} rx={5} fill={p.accent} opacity={0.85} />
      </g>
    ))}
  </svg>
);

/** Profile tab bar. */
const profileTabs: Fig = (p) => {
  const tabs = ['Preferences', 'Account', 'Notifications', 'Cloud Backups', 'Data & Security'];
  return (
    <svg viewBox="0 0 640 230" className="w-full h-auto" role="img" fontFamily={FONT}>
      <rect x={0} y={0} width={640} height={230} rx={12} fill={p.frame} stroke={p.border} />
      <text x={28} y={40} fontSize={16} fontWeight={700} fill={p.text}>Profile &amp; Settings</text>
      {/* tab bar */}
      <line x1={28} y1={84} x2={612} y2={84} stroke={p.border} />
      {tabs.map((t, i) => {
        const x = 28 + i * 118;
        const active = i === 1;
        return (
          <g key={t}>
            <text x={x + 4} y={74} fontSize={11.5} fontWeight={active ? 700 : 500}
              fill={active ? p.accent : p.muted}>{t}</text>
            {active && <rect x={x} y={81} width={92} height={3} rx={2} fill={p.accent} />}
          </g>
        );
      })}
      {/* account tab content */}
      <text x={28} y={116} fontSize={13} fontWeight={700} fill={p.text}>Account</text>
      {[
        'Profile info (name, email)',
        'Change password',
        'Passkeys — sign in without a password',
        'Two-factor authentication (2FA)',
      ].map((row, i) => (
        <g key={row}>
          <rect x={28} y={128 + i * 24} width={584} height={20} rx={5} fill={p.panel} />
          <text x={40} y={143 + i * 24} fontSize={11.5} fill={p.text}>{row}</text>
          <text x={598} y={143 + i * 24} textAnchor="end" fontSize={11} fill={p.accent}>›</text>
        </g>
      ))}
    </svg>
  );
};

/** Dashboard overview. */
const dashboardOverview: Fig = (p) => (
  <svg viewBox="0 0 640 300" className="w-full h-auto" role="img" fontFamily={FONT}>
    <rect x={0} y={0} width={640} height={300} rx={12} fill={p.frame} stroke={p.border} />
    {/* hero */}
    <rect x={0} y={0} width={640} height={92} rx={12} fill={p.accent} />
    <rect x={0} y={70} width={640} height={22} fill={p.accent} />
    <text x={28} y={40} fontSize={13} fill={p.accentText} opacity={0.85}>Good morning,</text>
    <text x={28} y={66} fontSize={20} fontWeight={800} fill={p.accentText}>Captain</text>
    <rect x={468} y={30} width={148} height={36} rx={9} fill={p.frame} opacity={0.95} />
    <text x={498} y={53} fontSize={13} fontWeight={700} fill={p.accent}>+  Log Flight</text>
    {/* stat tiles */}
    {[
      { l: 'Total time', v: '842:20' },
      { l: 'PIC time', v: '611:05' },
      { l: 'Flights', v: '498' },
      { l: 'Landings', v: '512' },
    ].map((s, i) => {
      const x = 28 + i * 148;
      return (
        <g key={s.l}>
          <rect x={x} y={112} width={132} height={64} rx={10} fill={p.card} stroke={p.border} />
          <text x={x + 16} y={140} fontSize={18} fontWeight={800} fill={p.text} fontFamily={MONO}>{s.v}</text>
          <text x={x + 16} y={160} fontSize={11} fill={p.muted}>{s.l}</text>
        </g>
      );
    })}
    {/* currency + recent */}
    <rect x={28} y={190} width={286} height={92} rx={10} fill={p.card} stroke={p.border} />
    <text x={44} y={214} fontSize={12} fontWeight={700} fill={p.text}>Flight currency</text>
    <Pill x={44} y={228} w={86} label="SEP ✓" fill={p.green} text="#ffffff" />
    <Pill x={140} y={228} w={96} label="Night ⚠" fill={p.amber} text="#ffffff" />
    <text x={44} y={268} fontSize={11} fill={p.muted}>At-a-glance status the moment you land.</text>
    <rect x={326} y={190} width={286} height={92} rx={10} fill={p.card} stroke={p.border} />
    <text x={342} y={214} fontSize={12} fontWeight={700} fill={p.text}>Recent flights</text>
    <text x={342} y={238} fontSize={11} fill={p.muted}>2026-07-14 · EDDF → EDDH</text>
    <text x={342} y={258} fontSize={11} fill={p.muted}>2026-07-12 · EDDH → EDDW</text>
  </svg>
);

const helpFigures: Record<string, Fig> = {
  'nav-overview': navOverview,
  'theme-toggle': themeToggle,
  'add-flight': addFlight,
  'flight-form': flightForm,
  'flight-search': flightSearch,
  quicklog,
  'add-aircraft': addAircraft,
  'currency-status': currencyStatus,
  'add-license': addLicense,
  'credentials-status': credentialsStatus,
  'signature-section': signatureSection,
  'import-steps': importSteps,
  'reports-overview': reportsOverview,
  'profile-tabs': profileTabs,
  'dashboard-overview': dashboardOverview,
};

/**
 * Renders a help figure by id inside a captioned frame. Built entirely from
 * inline elements (`span`) so it is valid where react-markdown places images
 * (inside a `<p>`). Returns `null` for unknown ids.
 */
export function HelpFigure({ id, caption }: { id: string; caption?: string }) {
  const { resolvedTheme } = useTheme();
  const palette = resolvedTheme === 'dark' ? DARK : LIGHT;
  const draw = helpFigures[id];
  const svg = useMemo(() => draw?.(palette), [draw, palette]);
  if (!svg) return null;

  return (
    <span className="my-6 block not-prose">
      <span className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
        {svg}
      </span>
      {caption && (
        <span className="mt-2 block text-center text-xs text-slate-500 dark:text-slate-400">{caption}</span>
      )}
    </span>
  );
}
