# Contributing to NinerLog Frontend

Thank you for your interest in contributing to the NinerLog Frontend! This document provides guidelines specific to the frontend repository.

For general project guidelines, see the [project-level CONTRIBUTING.md](https://github.com/fjaeckel/ninerlog-project/blob/main/CONTRIBUTING.md).

## Prerequisites

- **Node.js 20+**
- **npm 10+**
- **Docker** (for e2e tests)
- **Playwright** (installed via `npx playwright install`)

## Getting Started

```bash
git clone git@github.com:fjaeckel/ninerlog-frontend.git
cd ninerlog-frontend
npm install
npx playwright install          # Install browser binaries for e2e
bash scripts/generate-api-client.sh   # Generate API client from OpenAPI spec
npm run dev                     # Start dev server on http://localhost:5173
```

## Development Workflow

### API-First Development

The frontend uses an auto-generated API client from the backend's OpenAPI spec.

1. If the API changed, regenerate the client: `bash scripts/generate-api-client.sh`
2. Never manually edit files in `src/api/` that are generated
3. Use the typed client for all API calls — no raw `fetch` or `axios` outside the API layer

### Project Structure

```
src/
  api/              → Generated API client and request helpers
  components/       → Reusable UI components
  hooks/            → Custom React hooks
  i18n/             → Internationalization (en, de)
  lib/              → Utility functions
  pages/            → Route-level page components
  stores/           → Zustand state stores
  test/             → Shared test utilities
  types/            → TypeScript type definitions
public/             → Static assets
scripts/            → Build and generation scripts
```

### Key Libraries

| Purpose | Library |
|---------|---------|
| Framework | React 19 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| State management | Zustand |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Routing | react-router-dom |
| i18n | i18next |
| Unit testing | Vitest |
| E2E testing | Playwright |

## Coding Standards

### TypeScript

```typescript
// ✅ Typed props with interface
interface FlightCardProps {
  flight: Flight;
  onEdit: (id: string) => void;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, onEdit }) => {
  // ...
};

// ❌ Never use `any`
function handleData(data: any) { /* ... */ }
```

### Design System

All UI must follow the NinerLog Design System defined in the copilot instructions. Key rules:

- Use `slate-*` for neutrals (not `gray-*`)
- Use `blue-600` for primary actions
- Signal colors: green = current, amber = expiring, red = expired
- Always provide `dark:` variants alongside light mode classes
- Use the predefined component classes: `.btn-primary`, `.card`, `.badge-current`, etc.
- Minimum touch target: 44×44px

### Tailwind CSS

```tsx
// ✅ Mobile-first, responsive
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
    Flight Log
  </h1>
</div>

// ❌ Desktop-first or inline styles
<div style={{ padding: '32px' }}>
  <h1 style={{ fontSize: '32px' }}>Flight Log</h1>
</div>
```

### Internationalization

All user-facing strings must use the `useTranslation` hook:

```tsx
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t } = useTranslation();
  return <h1>{t('flights.title')}</h1>;
};
```

- Add translations to both `src/i18n/locales/en.json` and `src/i18n/locales/de.json`
- Never hardcode user-facing strings in JSX

## Testing

**All code must be tested. No exceptions.**

### Running Tests

```bash
npm test                  # Vitest in watch mode
npx vitest run            # Vitest single run
npm run test:e2e          # Playwright e2e tests
npm run test:e2e:ui       # Playwright with UI
npm run lint              # ESLint
npm run type-check        # TypeScript type checking
```

### Coverage Target

- **Minimum 90% code coverage**
- Unit tests: hooks, utilities, stores, component logic
- E2E tests: full user flows (login, create flight, manage licenses, etc.)

### Writing Tests

**Unit tests** (Vitest):

```typescript
import { render, screen } from '@testing-library/react';
import { FlightCard } from './FlightCard';

describe('FlightCard', () => {
  it('displays flight date', () => {
    render(<FlightCard flight={mockFlight} onEdit={vi.fn()} />);
    expect(screen.getByText('2026-04-20')).toBeInTheDocument();
  });
});
```

**E2E tests** (Playwright):

```typescript
import { test, expect } from '@playwright/test';

test('user can log a flight', async ({ page }) => {
  await page.goto('/flights');
  await page.getByRole('button', { name: /log flight/i }).click();
  // ...
});
```

### Pre-Commit Checklist

Before committing, **all** of these must pass:

```bash
npm run lint              # ESLint
npm run type-check        # TypeScript
npx vitest run            # Unit tests
npx playwright test       # E2E tests
```

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(flights): add log flight modal validation
fix(auth): handle token refresh race condition
refactor(hooks): extract currency calculation logic
test(e2e): add license management flow
docs(i18n): add translation guide for contributors
```

### Types

| Type | Use |
|------|-----|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvement |

## Pull Request Process

1. Branch from `main` using `feature/`, `fix/`, or `docs/` prefix
2. Ensure all tests pass (`npx vitest run && npx playwright test`)
3. Ensure linting and type-check pass
4. Regenerate the API client if the OpenAPI spec changed
5. Open a PR with a clear title following conventional commits
6. Address review feedback

## Security

- Never use `dangerouslySetInnerHTML`
- API tokens are stored in Zustand state only (not localStorage)
- API calls use Bearer tokens in headers (not cookies)
- If adding external CDN resources, update the CSP in `nginx.conf`
- Run `npm audit` before submitting PRs

## Questions?

- Create an issue with the `question` label
- Email: frederic@ninerlog.app
