# PilotLog Frontend

Mobile-first web application for the EASA/FAA compliant pilot logbook system.

## Overview

A Progressive Web App (PWA) that allows pilots to log flights, track currency, and manage multiple licenses from any device. Built with React, TypeScript, and a mobile-first approach.

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS (mobile-first responsive design)
- **API Client**: Auto-generated from OpenAPI spec
- **State Management**: 
  - React Query (server state)
  - Zustand (client state)
- **PWA**: Workbox for offline support
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library

## Prerequisites

- Node.js 20+
- npm or pnpm
- Access to pilotlog-project repo (for OpenAPI spec)

## Quick Start

```bash
# Install dependencies
npm install

# Generate API client from OpenAPI spec
npm run generate:api

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## API Client Generation

The TypeScript API client is **auto-generated** from the OpenAPI specification.

### Automatic (CI/CD)
When the OpenAPI spec changes in `pilotlog-project`, GitHub Actions automatically:
1. Generates new TypeScript client
2. Creates a PR with changes
3. Runs tests to verify compatibility

### Manual
```bash
# Generate from default location
npm run generate:api

# Generate from custom spec path
npm run generate:api -- ../pilotlog-project/api-spec/openapi.yaml
```

**⚠️ Never edit files in `src/api/` manually!** They will be overwritten.

See [OpenAPI Generation Guide](../pilotlog-project/docs/OPENAPI_GENERATION.md) for details.

## Project Structure

```
src/
├── api/              # Generated API client (do not edit manually)
├── components/       # React components
│   ├── common/       # Reusable UI components
│   ├── flight-log/   # Flight logging components
│   ├── licenses/     # License management
│   └── dashboard/    # Dashboard views
├── hooks/            # Custom React hooks
├── pages/            # Route components
├── stores/           # Zustand stores
├── utils/            # Utilities and helpers
├── types/            # TypeScript type definitions
└── App.tsx           # Main application component
```

## Features

### Multi-License Management
- Switch between active licenses (PPL, SPL, etc.)
- View hours and currency per license
- License-specific flight log views

### Flight Logging
- Quick entry forms for common flight types
- Auto-calculation of totals
- EASA/FAA compliant field validation
- Photo attachments for receipts/documents

### Currency Tracking
- Visual currency indicators
- Automatic expiry warnings
- Per-license currency requirements
- Night/IFR currency tracking

### Offline Support
- Full offline capability with service workers
- Sync when connection restored
- Conflict resolution UI

## API Integration

The API client is generated from the OpenAPI specification:

```bash
# Regenerate API client (run after spec changes)
npm run generate:api
```

The generated client provides:
- TypeScript types for all API models
- Type-safe API methods
- Automatic request/response validation

## Development

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENV=development
```

### Code Generation

```bash
# Generate API client from OpenAPI spec
npm run generate:api

# Generate component templates
npm run generate:component ComponentName
```

### Mobile Testing

```bash
# Test on local network (access from mobile device)
npm run dev -- --host
```

## Styling Guidelines

- **Mobile-First**: Start with mobile layouts, scale up
- **Tailwind**: Use utility classes, extract to components when repeated
- **Dark Mode**: Support system preference
- **Accessibility**: WCAG 2.1 AA compliance

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Building

```bash
# Production build
npm run build

# Preview production build
npm run preview

# Analyze bundle size
npm run analyze
```

## Deployment

The app is designed to be deployed as a static site:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

## Related Repositories

- **[pilotlog-project](../pilotlog-project)**: Project planning and API spec
- **[pilotlog-api](../pilotlog-api)**: Backend API

## Contributing

See [CONTRIBUTING.md](../pilotlog-project/CONTRIBUTING.md) for guidelines.

## License

[To be determined]
