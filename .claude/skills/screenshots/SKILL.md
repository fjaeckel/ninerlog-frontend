---
name: screenshots
description: MANDATORY for every change that alters rendered UI in NinerLog — capture before/after screenshots with the harness in scripts/screenshots and look at them. Load and run before touching any JSX, CSS, Tailwind class, translation string, icon, or layout, and before reporting any UI work as done. Also covers adding a screen to the harness, fixing a target that renders empty, and reviewing empty/error/dark-mode states.
---

# Screenshots

**A UI change is not done until you have looked at it.** Tests pass on markup nobody would ship: an empty state that renders a raw translation key, a page whose column jumps 300px wider than its neighbour, text that vanishes into the dark-mode background. None of that shows up in `vitest`. It shows up in a screenshot.

So: **capture `before`, make the change, capture `after`, open both.** Every time.

## When this is mandatory

Any diff that touches:

- JSX or `className` on anything rendered
- `src/index.css` — tokens, `@layer components`, base styles
- a user-facing string, in either locale
- an icon, a layout, a page shell, a modal, a badge

Not mandatory for pure hooks, API-client, or type-only changes that render nothing new.

## The loop

```bash
# 1. before — on the unmodified tree
npm run shots -- before

# 2. make the change

# 3. after
npm run shots -- after

# 4. look at the pairs
#    .screenshots/before/<target>.<theme>.png
#    .screenshots/after/<target>.<theme>.png
```

Scope it to what you touched — the full run is ~35 screens × 2 themes:

```bash
npm run shots -- after flights flights-modal empty-flights
npm run shots -- after --mobile          # 390×844, the mobile-first check
npm run shots -- after --theme=dark      # one theme
npm run shots -- --help                  # list every target
```

Output lands in `.screenshots/<label>/` — gitignored, wiped at the start of each run for that label.

If you changed the tree before capturing `before`, get it back with `git stash` or `git checkout main -- <files>`, capture, then restore.

## What the harness is

`scripts/screenshots/` — three files, no API and no backend needed:

| File | Holds |
|---|---|
| `capture.mjs` | CLI, dev-server bootstrap, browser, the capture itself |
| `targets.mjs` | the list of screens, and how to reach each one |
| `fixtures.mjs` | the API responses, keyed by path |

Every `/api/v1/**` request is answered from `fixtures.mjs` via `page.route`, so screens render with a logbook that has flights in it, a rating about to lapse, and a credential that already expired. The session is seeded into `localStorage` before first paint; the welcome tour is marked seen so it never covers the shot. The dev server starts automatically if one is not already listening.

## Reading the pairs

Look for the things only a picture shows:

- **Both themes.** Light-only classes look fine until the dark shot. Every light class needs its `dark:` counterpart.
- **Empty and error states**, not just the happy path — `empty-*` and `error-*` targets exist for this.
- **The page column.** Does it match its neighbours? Content is 960px, dashboard 1280px, forms 640px.
- **Icons.** lucide, one size per role. An emoji in a shot is a finding.
- **Raw keys.** `nightNotApplicable` or `MEDICAL_CLASS_2` on screen means a missing translation or an untranslated enum.
- **Mobile.** `--mobile` for anything touching layout; the app is mobile-first and the bottom nav eats 56px.

A shot that prints `⚠` in the run output hit a page error — that is a bug in the change, not in the harness.

## Adding a screen

A screen with no target is a screen nobody reviews. Add one to `targets.mjs`:

```js
{ name: 'my-page', path: '/my-page' },

// a screen you have to interact with to reach
{
  name: 'my-page-modal',
  path: '/my-page',
  act: async (page) => {
    await page.getByRole('button', { name: /add thing/i }).first().click();
    await page.waitForTimeout(600);
  },
},

{ name: 'empty-my-page', path: '/my-page', empty: true },   // empty collections
{ name: 'error-my-page', path: '/my-page', fail: true },    // 500 on the list
{ name: 'my-public-page', path: '/public', anonymous: true }, // no session seeded
```

## When a screen renders empty

The hook asked for a path `fixtures.mjs` does not answer, so it got `null`. Add the path to `ROUTES` in `fixtures.mjs`, matching the shape in `src/api/schema.ts`. Watch for wrappers — `/aircraft` returns `{ data, pagination }`, `/licenses` returns a bare array, `/announcements` returns `{ announcements, hints }`. Getting the wrapper wrong renders an error boundary, not an empty page.

Fixture dates derive from a pinned `TODAY`, so "expires in 18 days" stays 18 days next month. Keep it that way — a fixture built from `new Date()` makes every capture differ from the last.

## Environment

The harness uses Playwright's bundled Chromium. If the sandbox ships its own at a fixed path, point at it:

```bash
SHOT_CHROMIUM=/opt/pw-browsers/chromium npm run shots -- after
SHOT_BASE_URL=http://localhost:4173 npm run shots -- after   # against a preview build
```
