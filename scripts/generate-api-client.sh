#!/bin/bash
set -e

# Generate TypeScript API client from OpenAPI spec
# Usage: ./scripts/generate-api-client.sh [path-to-openapi.yaml]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default to project repo spec
OPENAPI_SPEC="${1:-../ninerlog-project/api-spec/openapi.yaml}"

# Check if spec exists
if [ ! -f "$OPENAPI_SPEC" ]; then
    echo "❌ OpenAPI spec not found at: $OPENAPI_SPEC"
    exit 1
fi

echo "🔍 Using OpenAPI spec: $OPENAPI_SPEC"

# Output directory
OUTPUT_DIR="$PROJECT_ROOT/src/api"
SCHEMA_FILE="$OUTPUT_DIR/schema.ts"

echo "🧹 Cleaning generated schema..."
rm -f "$SCHEMA_FILE"
mkdir -p "$OUTPUT_DIR"

echo "⚙️  Generating TypeScript types with openapi-typescript..."

# Use Node 24 if available, otherwise use default
if [ -d "/opt/homebrew/opt/node@24" ]; then
    export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
    echo "ℹ️  Using Node $(node --version)"
fi

# Generate types using openapi-typescript
npx openapi-typescript "$OPENAPI_SPEC" -o "$SCHEMA_FILE"

echo "📝 Adding warning header to generated files..."
cat > "$OUTPUT_DIR/README.md" << 'EOF'
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
import { NinerLogClient } from '@/api';

// Configure client
const client = new NinerLogClient({
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

Generated from: `ninerlog-project/api-spec/openapi.yaml`
Generator: @hey-api/openapi-ts
EOF

echo "✅ TypeScript client generated successfully in $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "  1. Review generated types in src/api/"
echo "  2. Update API client usage if interface changed"
echo "  3. Run tests: npm test"
echo "  4. Commit changes"
