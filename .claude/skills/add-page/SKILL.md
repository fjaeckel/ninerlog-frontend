---
name: add-page
description: Recipe for adding a new route/page to the NinerLog frontend — lazy loading, auth guard, app-shell navigation, and forms. Load when creating a new screen, adding a route to App.tsx, adding a nav entry, or building a form with React Hook Form + Zod.
---

# Adding a page

Five steps, all required:

1. **Create the page** in `src/pages/<area>/FooPage.tsx`. Wrap content in `PageWrapper` / `PageHeader` from `@/components/ui` for consistent padding and headings. Default-export it (the lazy import expects a default).

2. **Register the route** in `src/App.tsx`:

   ```tsx
   const FooPage = lazyWithRetry(() => import('./pages/foo/FooPage'));

   // inside <Route element={<Layout />}>:
   <Route path="/foo" element={isAuthenticated ? <FooPage /> : <Navigate to="/login" />} />
   ```

   Every page is lazy-loaded through `lazyWithRetry` (`src/lib/lazyWithRetry.ts`) — it retries a failed chunk load and falls back to a reload, so a stale PWA deployment never strands a user on a blank screen. Plain `React.lazy` is not acceptable here.

3. **Add navigation** in `src/components/layout/Layout.tsx` — a `SidebarItem` and/or bottom-nav entry with a `lucide-react` icon.

4. **Add the nav label** to `src/i18n/locales/<lang>/nav.json` for **both** locales.

5. **Add a test.** At minimum a Vitest render test; an E2E spec if it's a user flow.

Public (unauthenticated) routes go outside the `<Layout>` element and redirect to `/dashboard` when already authenticated — see `/login`, `/register`, `/sign`.

## Forms on the page

React Hook Form + Zod, submitted through a mutation hook:

```tsx
const schema = z.object({
  name: z.string().min(1, 'Required'),
  hours: z.number().min(0),
});
type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } =
  useForm<FormData>({ resolver: zodResolver(schema) });

const create = useCreateThing();
const onSubmit = handleSubmit(async (values) => {
  try { await create.mutateAsync(values); onClose(); }
  catch (e) { setApiError(extractApiError(e)); }
});
```

Style fields with `.input` / `.input-error`, labels with `.form-label`, errors with `.form-error`. Validation messages go through `t()` like any other string. `src/components/flights/FlightForm.tsx` is the full-featured reference (autocomplete, collapsible sections, quick-add).

## Checklist

- [ ] Data access lives in a `src/hooks/` hook, not in the page
- [ ] Route is lazy-loaded via `lazyWithRetry` and auth-guarded
- [ ] Nav entry + `nav.json` label in every locale
- [ ] No hard-coded user-facing strings
- [ ] Styling reuses design-system classes
- [ ] `npx vitest run && npm run type-check && npm run lint` pass
