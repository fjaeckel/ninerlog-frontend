#!/bin/bash
#
# Cross-browser E2E runner — ON DEMAND ONLY.
#
# This is deliberately not wired into any push/PR/merge workflow: the matrix
# multiplies wall-clock time by the number of browsers and the suite is not
# fullyParallel. Run it before a release, after touching layout/date/export
# code, or when chasing a browser-specific bug report.
#
# Usage:
#   scripts/run-cross-browser-e2e.sh                       # webkit + msedge + chromium
#   scripts/run-cross-browser-e2e.sh webkit                # one browser
#   scripts/run-cross-browser-e2e.sh chromium webkit firefox
#   scripts/run-cross-browser-e2e.sh --compat-only webkit  # capability probe, no API needed
#   scripts/run-cross-browser-e2e.sh --docker              # bring up the full test stack first
#
# Browsers: chromium, chrome, msedge, webkit, firefox, mobile-chrome, mobile-safari
#   chrome/msedge drive the *branded* builds and must be installed:
#       npx playwright install chrome msedge
#   webkit/firefox use Playwright's bundled builds:
#       npx playwright install webkit firefox
#
# Note: Playwright cannot drive Safari.app. `webkit` is its WebKit build — the
# same engine, so it catches Safari's rendering/JS differences, but not
# Safari-app-only behaviour (ITP cookie eviction, platform authenticators).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

COMPAT_ONLY=0
USE_DOCKER=0
BROWSERS=()

for arg in "$@"; do
  case "$arg" in
    --compat-only) COMPAT_ONLY=1 ;;
    --docker) USE_DOCKER=1 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    -*) echo "Unknown flag: $arg" >&2; exit 2 ;;
    *) BROWSERS+=("$arg") ;;
  esac
done

# No CLI browsers given: fall back to E2E_BROWSERS (how the docker service and
# the CI workflow pass their selection), then to the default matrix.
if [ ${#BROWSERS[@]} -eq 0 ]; then
  IFS=',' read -r -a BROWSERS <<< "${E2E_BROWSERS:-chromium,webkit,msedge}"
fi

BROWSER_CSV="$(IFS=,; echo "${BROWSERS[*]}")"

echo "=================================================="
echo "🌐 Cross-browser E2E — ${BROWSER_CSV}"
echo "=================================================="

if [ "$USE_DOCKER" -eq 1 ]; then
  echo "🐳 Starting the e2e stack (API + Postgres + MailPit + dev server)..."
  docker compose -f docker-compose.test.yml --profile e2e up -d \
    postgres-test api-test mailpit-test frontend-dev seaweedfs-test
  trap 'docker compose -f docker-compose.test.yml --profile e2e down -v' EXIT
  export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:5174}"
fi

rm -rf test-results/browser-compat

PW_ARGS=()
[ "$COMPAT_ONLY" -eq 1 ] && PW_ARGS+=(browser-compat)
for b in "${BROWSERS[@]}"; do PW_ARGS+=(--project="$b"); done

# Each browser is reported separately below, so a red browser must not abort
# the others.
E2E_BROWSERS="$BROWSER_CSV" npx playwright test "${PW_ARGS[@]}"
PW_EXIT=$?

echo ""
node scripts/browser-compat-matrix.mjs || true

echo ""
if [ "$PW_EXIT" -eq 0 ]; then
  echo "✅ All browsers passed. Per-browser detail: npx playwright show-report"
else
  echo "❌ Failures present — open the report for the per-browser breakdown:"
  echo "     npx playwright show-report"
  echo "   Results are grouped by project, so a spec red in one browser and"
  echo "   green in another is a genuine cross-browser inconsistency."
fi

exit "$PW_EXIT"
