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

# Beta access gate configuration
# When BETA_PASSWORD is set, users must enter the code to access the site.
# The map matches the X-Beta-Token header against the configured password.
BETA_PASSWORD="${BETA_PASSWORD:-}"

if [ -n "$BETA_PASSWORD" ]; then
  cat > /etc/nginx/beta-gate.conf <<BETAEOF
# Beta gate ENABLED — password required
map \$http_x_beta_token \$beta_valid {
    default     "no";
    "$BETA_PASSWORD" "yes";
}
BETAEOF
  echo "Beta gate ENABLED"
else
  cat > /etc/nginx/beta-gate.conf <<BETAEOF
# Beta gate DISABLED — no BETA_PASSWORD set
map \$http_x_beta_token \$beta_valid {
    default "yes";
    ""      "yes";
}
BETAEOF
  echo "Beta gate disabled (no BETA_PASSWORD set)"
fi

# Execute the CMD
exec "$@"
