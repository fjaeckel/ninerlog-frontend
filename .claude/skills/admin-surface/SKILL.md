---
name: admin-surface
description: Keeping the admin console (src/pages/admin/AdminPage.tsx) rendering everything the API exposes — stat tiles, config rows, maintenance actions, audit entries, new tabs. Use after regenerating src/api/schema.ts, when the API adds a field to AdminStats or AdminConfig, when adding an admin-only screen or action, or when auditing the admin page for fields it silently drops.
---

# Keeping the admin console complete

The admin console is the operator's only view of the deployment. Every field the API
puts in `AdminStats` / `AdminConfig` is there because an operator needs it — a field the
page never renders is a feature nobody can see is switched on.

**The generated schema is the checklist.** `src/api/schema.ts` is regenerated from the
API's OpenAPI spec (`npm run generate:api`), so it always knows about fields the page has
not caught up with yet.

## Where it lives

| Part | File |
| --- | --- |
| All seven tabs, one component each | `src/pages/admin/AdminPage.tsx` |
| Queries and mutations | `src/hooks/useAdmin.ts` |
| Announcements tab data | `src/hooks/useAnnouncements.ts` |
| Strings | `src/i18n/locales/{en,de}/common.json` → `admin.*` |
| Tests | `src/__tests__/admin/` |

Tabs: `dashboard` `users` `audit` `email` `maintenance` `announcements` `config`.

## Find what the page is dropping

After every `npm run generate:api`, diff the schema against the page:

```bash
# fields the API reports
grep -n "AdminConfig:" -A 60 src/api/schema.ts
# fields the page actually renders
grep -o "data\.[a-zA-Z]*" src/pages/admin/AdminPage.tsx | sort -u
```

Anything in the first list and not the second is invisible to the operator. Right now
that is `authMode`, `oidcIssuer` and `documentFilesEnabled` — all populated by the API,
none of them on screen.

## Recipes

### A stat tile

`DashboardTab` builds a `stats` array of `{ label, value }` and maps it to cards.

```tsx
{ label: t('admin.dashboard.totalSignatures'), value: data.totalSignatures },
```

Pass `warn: true` when a non-zero value is something the operator should look at — that
is what turns the number amber (`lockedAccounts`, `disabledAccounts` do this). A
breakdown-by-dimension gets its own `card` below the grid, like
`cloudBackupDestinations`; sort the entries so the order is stable between renders.

### A config row

`ConfigTab` builds a `rows` array of `{ label, value: React.ReactNode }`.

- Booleans render as the green **configured** / amber **not configured** pair — reuse
  `t('admin.config.configured')` and `t('admin.config.notConfigured')` verbatim rather
  than inventing new wording per feature.
- Optional fields are `?` in the schema. Render `—` for `undefined`; never drop the row.
  "Off" and "not reported by this API version" look identical if the row disappears.
- When the API explains *why* something is off (`unverifiedCleanupDisabledReason`),
  render the reason, not just the off state.
- Lists render as `font-mono text-xs`, with a muted empty-state string.

### A maintenance action

`MaintenanceTab` is a stack of cards: title, description, button, result line. The
mutation lives in `src/hooks/useAdmin.ts` (never call `apiClient` from the component) and
the result of the call is shown inline — the operator needs to see what the action
actually did, not just that it returned.

Disable the button and explain why when the underlying subsystem is off, as
`unverifiedSweepDisabled` does. For anything irreversible, follow the delete-user
pattern in `UsersTab`: a confirmation step the admin has to type into.

### A new tab

Four edits in `AdminPage.tsx`, all in the same place:

1. add the id to the `Tab` union type
2. add `{ id, label: t('admin.tabs.x'), icon: <Icon className="w-4 h-4" /> }` to the
   `tabs` array (icons come from `lucide-react`)
3. add `{tab === 'x' && <XTab />}` to the render block
4. write the `XTab` component in the same file

The mobile `<select>` and the desktop tab strip are both driven by that one `tabs` array
— there is no second list to update.

### Hooks

Query keys are `['admin', <area>, ...params]`. Mutations invalidate the area they touch:

```ts
onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
```

An action that changes counts should also invalidate `['admin', 'stats']`, or the
dashboard keeps showing pre-action numbers.

## Always

- **Both locales.** Every new `admin.*` key exists in `en` *and* `de` — CI fails
  otherwise. See the `i18n` skill.
- **Every light class has a `dark:` counterpart**, neutrals are `slate-*`. See
  `design-system`.
- The audit tab renders `entry.action` **raw** in a badge. If a string looks wrong there,
  fix the action name in the API, not the display.
- The whole page is behind `user?.isAdmin`; do not add a second, weaker guard inside a
  tab.
- Extend `src/__tests__/admin/` — `AdminPage.test.tsx` for tabs and rendering,
  `AdminEmailTab.test.tsx` as the per-tab pattern.

## Before you push

- [ ] Every `AdminStats` / `AdminConfig` field in `src/api/schema.ts` is rendered
- [ ] Optional fields degrade to `—`, not to a missing row
- [ ] New strings in both `en` and `de`
- [ ] Mutations invalidate `['admin', …]`, including `stats` where counts change
- [ ] `npx vitest run && npm run type-check && npm run lint`

The API-side counterpart — which endpoint a feature owes a stat, flag, maintenance action
or audit entry to — is the `admin-surface` skill in `../ninerlog-api`.
