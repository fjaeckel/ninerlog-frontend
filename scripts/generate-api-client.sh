#!/bin/bash
set -e

# Generate TypeScript API client from OpenAPI spec
# Usage: ./scripts/generate-api-client.sh [path-to-openapi.yaml]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default to project repo spec
OPENAPI_SPEC="${1:-../pilotlog-project/api-spec/openapi.yaml}"

# Check if spec exists
if [ ! -f "$OPENAPI_SPEC" ]; then
    echo "❌ OpenAPI spec not found at: $OPENAPI_SPEC"
    exit 1
fi

echo "🔍 Using OpenAPI spec: $OPENAPI_SPEC"

# Output directory
OUTPUT_DIR="$PROJECT_ROOT/src/api"

echo "🧹 Cleaning output directory..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "⚙️  Generating TypeScript client..."

# Using openapi-typescript-codegen for better React Query integration
npx @hey-api/openapi-ts \
    -i "$OPENAPI_SPEC" \
    -o "$OUTPUT_DIR" \
    -c axios \
    --name PilotLogClient

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
EOF

echo "✅ TypeScript client generated successfully in $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "  1. Review generated types in src/api/"
echo "  2. Update API client usage if interface changed"
echo "  3. Run tests: npm test"
echo "  4. Commit changes"
