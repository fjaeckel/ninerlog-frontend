# NinerLog Frontend

Mobile-first Progressive Web App for [NinerLog](https://ninerlog.com) — a free, open-source, EASA/FAA compliant digital pilot logbook.

## Tech Stack

- **React** / **TypeScript** / **Vite**
- **Tailwind CSS** (mobile-first, dark mode)
- **React Router** (lazy-loaded routes)
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
- **ESLint** / **Prettier** / **Husky** + **lint-staged**

## Prerequisites

- Node.js
- npm

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

## Docker

```bash
# Development (hot-reload)
docker compose -f docker-compose.dev.yml up frontend

# Production build
docker build -t ninerlog-frontend .
```

## Documentation

- [Testing Guide](docs/TESTING.md) — Unit (Vitest) and E2E (Playwright) testing
- [Internationalization Guide](docs/I18N_DEVELOPER_GUIDE.md) — Adding translatable strings
- [Translation Guide](docs/TRANSLATION_GUIDE.md) — Contributing translations (currently EN + DE)
- [Implementation Notes](IMPLEMENTATION.md) — Feature summary and architecture decisions
- [API Specification](https://github.com/fjaeckel/ninerlog-api/blob/main/api-spec/openapi.yaml) — OpenAPI 3.1 spec (source of truth)

## Running NinerLog

To run your own NinerLog instance, see [ninerlog-dockerized](https://github.com/fjaeckel/ninerlog-dockerized) for a ready-to-use Docker Compose setup with pre-built images.

## Related Repositories

| Repository | Description |
|---|---|
| [ninerlog-api](https://github.com/fjaeckel/ninerlog-api) | Go backend REST API (includes OpenAPI spec) |
| [ninerlog-dockerized](https://github.com/fjaeckel/ninerlog-dockerized) | Self-hosted deployment (Docker Compose) |
| [ninerlog-website](https://github.com/fjaeckel/ninerlog-website) | Marketing website |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).
