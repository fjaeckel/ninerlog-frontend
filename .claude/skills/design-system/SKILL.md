---
name: design-system
description: NinerLog's Tailwind v4 design system — color tokens, component classes, dark mode, typography, and mobile-first layout rules. Load before writing or restyling any JSX/CSS, adding a UI primitive, changing a brand or status color, or reviewing markup for visual consistency.
---

# Design system

Tailwind CSS v4, configured **entirely in CSS**. There is no `tailwind.config.js` — tokens (`@theme`), base styles, component classes (`@layer components`), and utilities all live in `src/index.css`.

## Tokens

| Token family | Meaning |
|---|---|
| `--color-brand-*` / `--color-primary-*` | Aviation blue (`brand-600` = `#2563EB`; `primary` is a legacy alias) |
| `--color-current-*` | Green — current / valid |
| `--color-expiring-*` | Amber — expiring soon |
| `--color-expired-*` | Red — expired / invalid |
| `--font-sans` / `--font-mono` | Inter for UI, JetBrains Mono for tabular data |
| `--spacing-header*`, `--container-*` | Layout rhythm and max-widths |
| `--animate-*` | Named keyframes (`fade-in`, `slide-up`, `sheet-up`) |

They resolve to normal Tailwind utilities: `bg-brand-600`, `text-expired-500`, `bg-current-50`.

## Rules

- Neutrals are `slate-*`, **never** `gray-*`. Primary action is `blue-600`, hover `blue-700`.
- Status is semantic: green = current, amber = expiring, red = expired. Never signal by color alone — pair with an icon or text.
- Every light-mode class needs a `dark:` counterpart (`bg-white dark:bg-slate-800`).
- Mobile-first: base styles target phones, then `sm:` / `lg:`. Breakpoints sm 640 / md 768 / lg 1024 / xl 1280.
- Interactive targets: **≥ 44×44px on touch**, ≥ 24×24px with a pointer (WCAG 2.2 AA). `.btn-*`, `.input` and `.checkbox` already meet it; `.btn-sm` is 36px and grows to 44 under `(pointer: coarse)`. An inline link gets its height from `.link`'s padding, not from its text.
- Numeric data uses `font-mono tabular-nums`. Nothing is set below `text-xs` (12px); chart ticks are 11px.
- Radii: `rounded-lg` cards, `rounded-md` inputs/buttons, `rounded-full` badges.
- WCAG 2.1 AA: semantic HTML, focus management in modals, keyboard nav, no hover-only interactions.

## Component classes — reuse, don't re-derive

`.btn-primary` `.btn-secondary` `.btn-danger` `.btn-ghost` (+ `.btn-sm` `.btn-lg`) · `.input` `.input-error` `.checkbox` · `.link` · `.segmented` `.segment` · `.card` `.card-hover` · `.badge-current` `.badge-expiring` `.badge-expired` `.badge-info` `.badge-neutral` · `.form-label` `.form-error` `.form-helper` · `.page-title` `.section-title` · `.data-lg` `.data-sm` · `.hover-lift` `.surface-glass` `.gradient-brand` `.text-gradient-brand`

Repeating a utility chain? Add a class to `@layer components` instead of copying it.

Merge conditional/overriding classes with `cn()` (clsx + tailwind-merge):

```tsx
import { cn } from '@/lib/cn';
<div className={cn('card hover-lift', isActive && 'ring-2 ring-blue-500', className)} />
```

## Typography

| Role | Classes |
|---|---|
| Page title | `text-2xl font-bold text-slate-800 dark:text-slate-100` (or `.page-title`) |
| Section title | `text-lg font-semibold` (or `.section-title`) |
| Body | `text-base text-slate-600 dark:text-slate-300` |
| Muted | `text-sm text-slate-500 dark:text-slate-400` |
| Data | `font-mono text-sm tabular-nums` / `.data-lg` for large readouts |

## Layout & dark mode

Header `h-14` mobile / `h-16` on `lg:`; bottom nav `h-14`, hidden on `lg:`; sidebar `w-64` on `lg:`. Main content `pt-14 lg:pt-16 pb-16 lg:pb-4 lg:pl-64`.

Page width comes from `PageWrapper`, never from an ad-hoc `max-w-*`, and there are three:

| `maxWidth` | Width | For |
|---|---|---|
| `form` | 640px | a single column of fields |
| `content` | 960px | prose and step-by-step flows, bound by the reading measure |
| `list` | none | tables, record lists, dashboards — **fills the column**, because a wide monitor is width the reader does not have to scroll |

Notch safety via `pt-safe-top` / `pb-safe` and the `--header-height` / `--bottom-nav-height` variables.

Dark mode is class-based (`@custom-variant dark`): `useTheme()` runs once at the app root, resolves `system` against `matchMedia`, toggles `.dark` on `<html>`, and updates the mobile chrome color. In markup you only write `dark:` variants.

## Where to change what

| You want to… | Edit |
|---|---|
| A brand/status color globally | the `--color-*` token in `@theme` |
| All buttons/cards/badges | the class in `@layer components` |
| A new reusable treatment | a new class in `@layer components` |
| One component only | its `className`, composed with `cn` |
| A new animation | `@keyframes` + `--animate-*` token |

New reusable primitives go in `src/components/ui/` — presentational only, no data fetching, accept and merge a `className`, and export from `src/components/ui/index.ts`.
