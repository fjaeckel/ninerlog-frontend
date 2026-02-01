#!/bin/sh
set -e

# Inject runtime environment variables into JavaScript
# This allows configuring the frontend without rebuilding the image

cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-http://localhost:3000/api/v1}",
  VITE_ENV: "${VITE_ENV:-production}"
};
EOF

# Execute the CMD
exec "$@"
