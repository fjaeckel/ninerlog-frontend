---
name: terse-comments
description: House comment style — every comment is terse and states only the WHAT, never the WHY. Rationale, history, and justification live in git commit messages and documentation, not in source. Load before writing any comment, when touching code that contains comments, when reviewing a diff, or when auditing a file or component for comment style.
---

# Terse comments: the what, never the why

A comment in this codebase has exactly one job: label **what** the code next to it does, in
as few words as possible. It never explains **why** the code is the way it is. Rationale has
two homes, and source files are not one of them:

- **the git commit** that introduces or changes the line — `git log`/`git blame` recover it;
- **documentation** (`docs/DEVELOPER_GUIDE.md`, the `.claude/skills/`) — when the reason is a
  durable rule of the app.

The point: a what-comment goes stale the moment the code changes and is caught in review
because it sits next to the code it contradicts. A why-comment goes stale invisibly — the
reason stops being true and nothing in the diff flags it. Commits are immutable and dated;
docs are reviewed as a deliverable. Comments are neither.

## The rule

- A comment states what the following block does, or what a symbol is. One line wherever
  possible; never a paragraph.
- No rationale clauses: because, so that, otherwise, to avoid, this prevents/ensures,
  we need/decided, the reason is.
- No history or archaeology: "used to", "previously", "the old behaviour", "issue #N showed",
  "before the fix".
- No narration of the obvious. Code that reads clearly gets no comment at all — deleting is
  the default, rewriting the fallback.
- Writing a change and the why matters? Put it in the commit message body and, if it is a
  lasting rule of the app, in the right doc or skill — then keep the comment to the what, or
  drop it.
- Deleting an existing why-comment loses nothing: the rationale stays recoverable in the
  history of the commit that removes it and of the commits that wrote it.

## What stays

- **TSDoc/JSDoc on exported APIs** — written as contract statements: what it does, params,
  return, thrown/rejected errors. No design rationale, no history.
- **Directives**: `// eslint-disable-next-line ...`, `@ts-expect-error`, triple-slash refs.
  A directive keeps its required rule name, nothing more.
- **Generated-file markers** (`src/api/schema.ts` is generated — never touch it at all).
- **TODO/FIXME carrying an issue reference** — the issue holds the why.
- Test names (`it('...')`) do the explaining in tests; a comment inside a test states what is
  being asserted, not what regression prompted it.

## Rewrites

```ts
// Track whether a refresh is already in progress to avoid concurrent refreshes
// racing each other and both hitting the endpoint.
let refreshPromise: Promise<void> | null = null;
```
→
```ts
// In-flight token refresh, shared by concurrent callers.
let refreshPromise: Promise<void> | null = null;
```
The single-flight reason (racing refreshes) is the why — it goes in the commit, or the
`api-layer` skill if it is a lasting rule of the auth flow.

```ts
const skewMs = 30_000; // refresh slightly early to avoid clock-skew 401s
```
→
```ts
const skewMs = 30_000; // refresh this long before expiry
```

```tsx
// Scope the "Flights" label lookup to the main content area to avoid
// matching the identical label in the nav sidebar.
```
→
```tsx
// "Flights" label inside <main> only.
```

## Auditing a file

1. Read every comment (`//`, `/* */`, `{/* */}`) in the file, including TSDoc.
2. For each: does it state anything other than the what? Rewrite to a single what-line or
   delete it. Never alter the code itself while doing so.
3. Skip `src/api/schema.ts` and anything generated.
4. `npx vitest run && npm run type-check && npm run lint` must stay green — comment edits
   change no behaviour, so any failure is a mistake in the edit.
