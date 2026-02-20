# NinerLog Frontend

Mobile-first Progressive Web App for NinerLog — an EASA/FAA compliant digital pilot logbook.

## Tech Stack

- **React 19** / **TypeScript 5.9** / **Vite 7**
- **Tailwind CSS 4** (mobile-first, dark mode)
- **React Router 7** (lazy-loaded routes)
- **TanStack React Query** (server state) / **Zustand** (client state)
- **React Hook Form** + **Zod** (form validation)
- **Recharts** (charts & statistics)
- **Leaflet** + **react-leaflet** (route maps)
- **openapi-fetch** (type-safe API client, auto-generated)
- **VitePWA** (installable, offline-capable)

### Dev & Testing

- **Vitest** + **React Testing Library** (unit tests)
- **Playwright** (E2E tests)
- **MSW** (API mocking)
- **ESLint 9** / **Prettier** / **Husky** + **lint-staged**

## Prerequisites

- Node.js 24+
- npm 11+
- Access to `ninerlog-project` repo (for OpenAPI spec)

## Quick Start

```bash
npm install
npm run generate:api      # Generate typed API client from OpenAPI spec
npm run dev               # Start dev server at http://localhost:5173
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server (port 5173, proxies `/api` → `localhost:3000`) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm run type-check` | TypeScript `--noEmit` |
| `npm run generate:api` | Generate API client from OpenAPI spec |

## Project Structure

```
src/
├── api/                  # Generated API client & types (do not edit)
├── components/
│   ├── layout/           # App shell (sidebar, header, bottom nav)
│   ├── ui/               # Reusable primitives (PageWrapper, EmptyState, etc.)
│   ├── aircraft/         # Aircraft forms
│   ├── credentials/      # Credential forms
│   ├── currency/         # Currency cards
│   ├── flights/          # Flight cards & forms
│   └── licenses/         # License cards, forms, switcher
├── hooks/                # Custom hooks (useFlights, useCurrency, etc.)
├── lib/                  # Utilities (config, classnames, API helpers)
├── pages/                # Route page components
│   ├── auth/             # Login, Register, Reset Password
│   ├── flights/          # Flights list, Flight detail
│   ├── aircraft/         # Aircraft management
│   ├── credentials/      # Credentials management
│   ├── currency/         # Currency/recency status
│   ├── export/           # PDF logbook export
│   ├── import/           # CSV flight import
│   ├── licenses/         # License management
│   ├── maps/             # Route map
│   └── reports/          # Statistics & charts
├── stores/               # Zustand stores (auth, license, theme)
├── test/                 # Test setup
├── types/                # Shared TypeScript types
└── __tests__/            # Unit & E2E tests
```

## Pages & Routes

| Route | Page | Auth |
|---|---|---|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/reset-password` | Password Reset | Public |
| `/dashboard` | Dashboard | Protected |
| `/flights` | Flight Log | Protected |
| `/flights/:flightId` | Flight Detail | Protected |
| `/aircraft` | Aircraft | Protected |
| `/currency` | Currency Status | Protected |
| `/licenses` | Licenses | Protected |
| `/credentials` | Credentials | Protected |
| `/reports` | Reports & Charts | Protected |
| `/map` | Route Map | Protected |
| `/import` | CSV Import | Protected |
| `/export` | PDF Export | Protected |
| `/profile` | Profile & Settings | Protected |

## API Client Generation

The TypeScript API client and types are **auto-generated** from the OpenAPI spec in `ninerlog-project/api-spec/openapi.yaml`.

```bash
npm run generate:api
```

**Do not edit files in `src/api/` manually** — they will be overwritten on regeneration.

## Environment

Runtime configuration is injected via `public/env-config.js` (for Docker) or Vite env vars (for development):

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | API base URL |
| `VITE_ENV` | `development` | Environment name |

## Docker

Multi-stage build: `node:20-alpine` (build) → `nginx:1.25-alpine` (serve). Nginx handles SPA routing, gzip, security headers, static asset caching, and optional TLS via Let's Encrypt.

```bash
# From workspace root
docker compose -f docker-compose.dev.yml up -d   # Dev (hot reload)
docker compose up -d                               # Production
```

See [DOCKER.md](../DOCKER.md) for full deployment guide.

## Testing

```bash
npm test                 # Unit tests
npm run test:e2e         # E2E tests (Playwright)
```

## Related Repositories

- [ninerlog-project](../ninerlog-project) — OpenAPI spec & project planning
- [ninerlog-api](../ninerlog-api) — Go backend API
