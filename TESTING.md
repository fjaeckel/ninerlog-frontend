# Testing Guide - PilotLog Frontend

## Test Suite Overview

The frontend includes comprehensive testing at three levels:

1. **Unit Tests** (18 tests) - Component and hook testing with React Testing Library
2. **E2E Tests** (14 tests) - End-to-end user flows with Playwright
3. **Integration Tests** - API integration testing with MSW (Mock Service Worker)

## Quick Commands

```bash
# Run all unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Build for production
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

## Test Coverage

### Unit Tests

**Auth Components (6 tests)**
- ✅ `LoginPage.test.tsx` - Login form rendering, validation, submission, error handling
- ✅ `RegisterPage.test.tsx` - Registration form, password matching, error handling

**License Components (12 tests)**
- ✅ `LicenseForm.test.tsx` - Form rendering, validation, create/edit operations
- ✅ `LicenseCard.test.tsx` - License display, edit/delete actions, expiry warnings

### E2E Tests

**Authentication Flow (7 tests)**
- ✅ Display login form
- ✅ Navigate to registration
- ✅ Show validation errors
- ✅ Complete registration flow
- ✅ Complete login flow
- ✅ Password reset flow
- ✅ Logout functionality

**License Management (7 tests)**
- ✅ Display empty state
- ✅ Open license form modal
- ✅ Create new license
- ✅ Display license cards
- ✅ Edit existing license
- ✅ Delete license
- ✅ Switch active license

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

### Unit Tests

```bash
# Run all tests once
npm test -- --run

# Watch mode for development
npm test

# With coverage report
npm test -- --coverage

# Run specific test file
npm test LoginPage

# Update snapshots
npm test -- -u
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e auth.spec.ts

# Debug mode
npm run test:e2e -- --debug

# Interactive UI mode
npm run test:e2e:ui
```

### Running with Backend

For E2E tests to work with real API:

```bash
# Terminal 1: Start backend API
cd ../pilotlog-api
make run

# Terminal 2: Start frontend dev server
cd ../pilotlog-frontend
npm run dev

# Terminal 3: Run E2E tests
npm run test:e2e
```

## Test Structure

```
src/
├── __tests__/
│   ├── auth/
│   │   ├── LoginPage.test.tsx
│   │   └── RegisterPage.test.tsx
│   ├── licenses/
│   │   ├── LicenseForm.test.tsx
│   │   └── LicenseCard.test.tsx
│   └── e2e/
│       ├── auth.spec.ts
│       └── licenses.spec.ts
└── test/
    └── setup.ts              # Global test setup
```

## Writing Tests

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('handles user interaction', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MyComponent />
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test('completes user action', async ({ page }) => {
    await page.goto('/page');
    await page.getByLabel('Input').fill('value');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --run
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## Debugging

### Unit Tests

```bash
# Use console.debug to see component output
screen.debug();

# Or debug specific element
screen.debug(screen.getByRole('button'));
```

### E2E Tests

```bash
# Run with debug flag
npm run test:e2e -- --debug

# Or add pause in test
await page.pause();
```

## Troubleshooting

### Tests Failing

1. **Check dependencies**: `npm install`
2. **Check backend**: Ensure API is running on port 3000
3. **Clear cache**: `rm -rf node_modules/.vite`
4. **Update browsers**: `npx playwright install`

### Type Errors

```bash
# Rebuild types
npm run type-check

# Clear TypeScript cache
rm -rf node_modules/.cache
```

### Port Already in Use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

## Coverage Goals

- Unit Tests: >80% coverage
- E2E Tests: All critical user flows covered
- Integration Tests: All API endpoints tested

## Next Steps

1. Add integration tests for API hooks
2. Add visual regression tests with Percy
3. Add performance tests with Lighthouse
4. Add accessibility tests with axe-core
