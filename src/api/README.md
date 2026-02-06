# Generated API Client

⚠️ **DO NOT EDIT THESE FILES MANUALLY**

This directory contains auto-generated TypeScript code from the OpenAPI specification.

## Regeneration

To regenerate the client after OpenAPI spec changes:

```bash
npm run generate:api
```

Or specify a custom spec path:

```bash
npm run generate:api -- /path/to/openapi.yaml
```

## Usage

```typescript
import { PilotLogClient } from '@/api';

// Configure client
const client = new PilotLogClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// Use with React Query
const { data: flights } = useQuery({
  queryKey: ['flights', licenseId],
  queryFn: () => client.flights.listFlights({ licenseId })
});
```

## Source

Generated from: `pilotlog-project/api-spec/openapi.yaml`
Generator: @hey-api/openapi-ts
