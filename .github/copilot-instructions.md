# GitHub Copilot Instructions for NinerLog Frontend

You are assisting with the NinerLog Frontend repository, a mobile-first Progressive Web App for pilot logbook management.

## IMPORTANT: Design System

**ALL UI code must follow the NinerLog Design System.** Before writing any UI code, consult:

- `../ninerlog-project/docs/design/design-system.md` — Colors, typography, spacing, tokens
- `../ninerlog-project/docs/design/components.md` — Component specs (Button, Input, Badge, Card, etc.)
- `../ninerlog-project/docs/design/screens.md` — Screen layouts, wireframes, states
- `../ninerlog-project/docs/design/interactions.md` — Navigation, forms, gestures, offline UX
- `../ninerlog-project/docs/design/handoff.md` — Implementation guide, naming, patterns

### Design System Quick Reference

```
Primary Blue:     #2563EB (brand-600, buttons, links)
Aviation Dark:    #1E3A5F (brand-800, header backgrounds)
Success Green:    #16A34A (current-600, valid status)
Warning Amber:    #D97706 (expiring-600, expiring status)
Danger Red:       #DC2626 (expired-600, expired/critical)
Background:       slate-50 (light) / slate-900 (dark)
Card:             white / slate-800 (dark), border-slate-200/700, rounded-lg, shadow-sm
Font:             Inter (UI) / JetBrains Mono (data)
Min touch target: 44×44px
Border radius:    8px cards / 6px inputs+buttons / full badges
```

### Color Rules
- Use `slate-*` palette for neutrals (NOT `gray-*`)
- Use `blue-600` for primary actions, `blue-700` on hover
- Use aviation signal colors: green=current, amber=expiring, red=expired
- Always provide `dark:` variant classes alongside light mode
- Never rely on color alone — pair with icons/text

### Typography Classes
- Page title: `text-2xl font-bold text-slate-800 dark:text-slate-100`
- Section title: `text-lg font-semibold`
- Body: `text-base text-slate-600 dark:text-slate-300`
- Muted: `text-sm text-slate-500 dark:text-slate-400`
- Data display: `font-mono text-sm tabular-nums`
- Large data: `text-2xl font-bold font-mono tabular-nums`

### Component Classes (defined in index.css)
- `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost`
- `.btn-sm` / `.btn-lg`
- `.input` / `.input-error`
- `.card` / `.card-hover`
- `.badge-current` / `.badge-expiring` / `.badge-expired` / `.badge-info` / `.badge-neutral`
- `.form-label` / `.form-error` / `.form-helper`
- `.page-title` / `.section-title`
- `.data-lg` / `.data-sm`

### Layout Structure
- Fixed header: `h-14` mobile, `h-16` desktop (lg:)
- Bottom nav: `h-14`, hidden on `lg:` screens
- Desktop sidebar: `w-64`, visible on `lg:` screens
- Main content: `pt-14 lg:pt-16 pb-16 lg:pb-4 lg:pl-64`
- Content max-widths: forms=640px, lists=960px, dashboard=1280px

## Repository Context

This is the **frontend web application** built with React and TypeScript. It provides:
- Mobile-first responsive UI for flight logging
- Multi-license management interface
- Offline-capable PWA functionality
- Auto-generated API client from OpenAPI spec

## Key Principles

1. **Mobile-First**: Always design for mobile screens first, then scale up
2. **Type-Safety**: Leverage TypeScript strictly, use generated API types
3. **Offline-First**: Consider offline scenarios in all features
4. **Accessibility**: WCAG 2.1 AA compliance required
5. **Performance**: Optimize for slow mobile connections
6. **Testing**: All code must be tested - unit, integration, and e2e tests required

## Testing Requirements

**ALL CODE MUST BE TESTED.** Testing is not optional.

### Mandatory Verification Before Completion

**ALWAYS run ALL tests (unit + e2e) before declaring any task complete or pushing code.**

1. Run unit tests: `npx vitest run`
2. Run e2e tests: `npx playwright test` (if applicable)
3. Run type checking: `npx tsc --noEmit`
4. All must pass with zero failures before any commit or verification.
5. If any test fails, fix the failure before proceeding.
6. Never skip tests or mark a task as done without a green test run.

### Unit Tests (Vitest + React Testing Library)
- **Required for**: All components, hooks, utilities, and state management
- **Coverage target**: Minimum 90% code coverage
- **Test user behavior**, not implementation details
- Mock external dependencies (API calls, browser APIs)
- Test edge cases and error states

```typescript
// Component unit test
import { render, screen, fireEvent } from '@testing-library/react';
import { FlightLogEntry } from './FlightLogEntry';

describe('FlightLogEntry', () => {
  it('should display validation error for invalid date', async () => {
    render(<FlightLogEntry licenseId="123" onSubmit={jest.fn()} />);
    
    const dateInput = screen.getByLabelText(/date/i);
    fireEvent.change(dateInput, { target: { value: 'invalid' } });
    fireEvent.blur(dateInput);
    
    expect(await screen.findByText(/invalid date/i)).toBeInTheDocument();
  });
});

// Hook unit test
import { renderHook, waitFor } from '@testing-library/react';
import { useFlights } from './useFlights';

describe('useFlights', () => {
  it('should fetch flights for license', async () => {
    const { result } = renderHook(() => useFlights('license-123'));
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(5);
  });
});
```

### Integration Tests
- **Required for**: Complete user flows (login → create flight → view stats)
- **Test**: Multiple components working together with real state management
- **Mock**: Only API calls (use MSW - Mock Service Worker)
- **Verify**: Data flows correctly through the application

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from './App';

const server = setupServer(
  rest.post('/api/flights', (req, res, ctx) => {
    return res(ctx.json({ id: '123', ...req.body }));
  })
);

describe('Flight logging flow', () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());
  
  it('should create flight and show in list', async () => {
    render(<App />);
    
    // Navigate to flight log
    fireEvent.click(screen.getByText(/log flight/i));
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/date/i), { 
      target: { value: '2026-01-30' } 
    });
    fireEvent.change(screen.getByLabelText(/total time/i), { 
      target: { value: '2.5' } 
    });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify in list
    await waitFor(() => {
      expect(screen.getByText(/2\.5 hours/i)).toBeInTheDocument();
    });
  });
});
```

### End-to-End Tests (Playwright)
- **Required for**: Critical user journeys
- **Test**: Real browser, real API calls (against test environment)
- **Cover**: Authentication, flight logging, offline sync, PWA install
- **Run**: Before every deployment

```typescript
import { test, expect } from '@playwright/test';

test('complete flight logging flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'pilot@test.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await expect(page.locator('h1')).toContainText('Dashboard');
  
  // Create flight
  await page.click('text=Log Flight');
  await page.selectOption('[name="licenseId"]', 'PPL-123');
  await page.fill('[name="date"]', '2026-01-30');
  await page.fill('[name="totalTime"]', '2.5');
  await page.click('button:has-text("Save")');
  
  // Verify success
  await expect(page.locator('.toast')).toContainText('Flight logged successfully');
  
  // Check in list
  await page.click('text=My Flights');
  await expect(page.locator('.flight-row').first()).toContainText('2.5');
});

test('offline mode sync', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  
  // Go offline
  await context.setOffline(true);
  
  // Create flight while offline
  await page.goto('/flights/new');
  // ... fill form ...
  await page.click('button:has-text("Save")');
  
  await expect(page.locator('.offline-indicator')).toBeVisible();
  
  // Go online
  await context.setOffline(false);
  
  // Verify sync
  await expect(page.locator('.toast')).toContainText('Synced');
});
```

### When to Write Tests
1. **Before implementation** (TDD when complexity is high)
2. **Alongside implementation** (most common)
3. **Never after** - no untested code should be committed

### What to Test
- ✅ User interactions (clicks, typing, navigation)
- ✅ Form validation and submission
- ✅ Error states and error messages
- ✅ Loading states
- ✅ Accessibility (keyboard nav, screen readers)
- ✅ Responsive behavior (mobile, tablet, desktop)
- ✅ Offline functionality
- ✅ Edge cases (empty states, max values, special characters)
- ❌ Implementation details (state variable names, internal functions)
- ❌ Third-party library internals

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Build**: Vite
- **Styling**: TailwindCSS (utility-first)
- **API Client**: Auto-generated from OpenAPI (in `/src/api/`)
- **State**: React Query + Zustand
- **Forms**: React Hook Form + Zod validation
- **PWA**: Workbox service workers
- **Testing**: Vitest + React Testing Library

## When Writing Code

### Component Structure
```typescript
// Prefer function components with TypeScript
interface FlightLogEntryProps {
  licenseId: string;
  onSubmit: (data: FlightLogData) => Promise<void>;
}

export const FlightLogEntry: React.FC<FlightLogEntryProps> = ({ 
  licenseId, 
  onSubmit 
}) => {
  // Implementation
};
```

### Mobile-First Styling
```typescript
// Start with mobile, use Tailwind breakpoints to scale up
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-xl md:text-2xl lg:text-3xl">
    Flight Log
  </h1>
</div>
```

### API Integration
```typescript
// Use generated API client with React Query
import { useQuery, useMutation } from '@tanstack/react-query';
import { flightsApi } from '@/api'; // Auto-generated

const { data: flights } = useQuery({
  queryKey: ['flights', licenseId],
  queryFn: () => flightsApi.getFlights({ licenseId }),
});
```

### Form Handling
```typescript
// Use React Hook Form with Zod validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { flightLogSchema } from '@/schemas/flight-log';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(flightLogSchema),
});
```

## File Organization

```
src/
├── api/              # Generated API client (DO NOT EDIT MANUALLY)
├── components/
│   ├── common/       # Reusable UI components
│   ├── flight-log/   # Flight logging specific
│   ├── licenses/     # License management
│   └── layout/       # Layout components
├── hooks/            # Custom React hooks
├── pages/            # Route components
├── stores/           # Zustand stores
├── utils/            # Helper functions
├── types/            # Custom TypeScript types
└── schemas/          # Zod validation schemas
```

## Aviation Domain Awareness

### License Types
When building UI for licenses, support these types:
- PPL (Private Pilot License)
- SPL (Sailplane Pilot License)
- CPL (Commercial Pilot License)
- ATPL (Airline Transport Pilot License)
- IR (Instrument Rating)

### Flight Log Fields
Essential fields to include in forms:
- Date, aircraft registration, type
- Departure/arrival airports and times
- Total time, PIC, dual, solo hours
- Night time, IFR time
- Day/night landings
- Remarks

### Multi-License Context
- Always show which license is currently active
- Allow quick switching between licenses
- Calculate totals per license
- Show currency status per license
- Warn about license-specific limitations (e.g., SPL can't log night flights)

## Code Quality Standards

### TypeScript
- Enable strict mode
- No `any` types (use `unknown` if needed)
- Proper type guards for runtime checks
- Use discriminated unions for complex states

### React Best Practices
- Functional components with hooks
- Proper dependency arrays in useEffect
- Memoization for expensive calculations
- Error boundaries for component failures
- Suspense for async components

### Styling
- **Always follow the NinerLog Design System** (see `../ninerlog-project/docs/design/`)
- Tailwind utility classes preferred, use design system component classes
- Use `slate-*` palette for neutrals (NEVER `gray-*`)
- Always provide `dark:` variant classes alongside light mode
- Use aviation signal colors: green=current, amber=expiring, red=expired
- Responsive breakpoints: sm (640), md (768), lg (1024), xl (1280), 2xl (1536)
- Border radius: rounded-lg (cards), rounded-md (inputs/buttons), rounded-full (badges)
- Min touch targets: 44×44px on all interactive elements
- Extract to component classes in index.css when repeating patterns
- Use `font-mono tabular-nums` for all numeric data display

### Testing
- Test user interactions, not implementation
- Mock API calls consistently
- Test accessibility (screen reader, keyboard nav)
- Test mobile-specific behaviors

## Common Patterns

### License Switcher
```typescript
const { activeLicense, setActiveLicense } = useLicenseStore();

<LicenseSelector 
  licenses={userLicenses}
  active={activeLicense}
  onChange={setActiveLicense}
/>
```

### Offline Detection
```typescript
const isOnline = useOnlineStatus();

{!isOnline && (
  <OfflineBanner>You're offline. Changes will sync when online.</OfflineBanner>
)}
```

### Form with Validation
```typescript
const onSubmit = async (data: FlightLogFormData) => {
  try {
    await createFlight.mutateAsync(data);
    toast.success('Flight logged successfully');
  } catch (error) {
    toast.error('Failed to log flight');
  }
};
```

## Performance Optimization

- Lazy load route components
- Virtual scrolling for long lists
- Image optimization (WebP, lazy loading)
- Code splitting by route
- Service worker caching strategies

## Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus management in modals
- Color contrast ratios (WCAG AA)
- Screen reader announcements for dynamic content

## Mobile Considerations

- Touch targets minimum 44x44px
- Swipe gestures for common actions
- Pull-to-refresh patterns
- Bottom navigation for key actions
- Avoid hover-only interactions
- Test on actual devices

## Related Repositories

- **ninerlog-project**: API spec and project planning
- **ninerlog-api**: Backend API implementation

When making changes:
- Check API spec for endpoint availability
- Regenerate API client after spec updates
- Coordinate breaking changes with backend team

## Generated Code

The `/src/api/` directory is auto-generated from OpenAPI spec:
- **DO NOT** edit files in this directory manually
- Regenerate after spec updates: `npm run generate:api`
- Use generated types throughout the app
- Report issues with generation process, not generated code

## Environment

Development environment variables (`.env.local`):
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENV=development
```

## Common Commands

- `npm run dev` - Start dev server
- `npm run generate:api` - Regenerate API client
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run lint` - Lint code
