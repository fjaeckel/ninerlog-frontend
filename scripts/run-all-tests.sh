#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "=================================================="
echo "🧪 Running NinerLog Frontend Tests in Docker"
echo "=================================================="
echo ""

# Run unit tests
echo "📦 Running unit tests (Vitest)..."
docker compose -f docker-compose.test.yml --profile test up --build --abort-on-container-exit --exit-code-from frontend-test
docker compose -f docker-compose.test.yml --profile test down

echo ""
echo "✅ Frontend unit tests completed!"
echo ""

# Check if user wants to skip e2e tests
if [ "$1" = "--skip-e2e" ]; then
    echo "ℹ️  Skipping E2E tests (--skip-e2e flag provided)."
else
    echo "=================================================="
    echo "🌐 Running E2E tests (Playwright)..."
    echo "=================================================="
    echo ""
    
    echo "🐳 Starting test environment (DB + MailPit + API + Frontend)..."
    docker compose -f docker-compose.test.yml --profile e2e up -d --build postgres-test mailpit-test api-test frontend-dev
    
    echo "⏳ Waiting for services to be healthy..."
    sleep 10
    
    echo "🧪 Running Playwright tests..."
    docker compose -f docker-compose.test.yml --profile e2e up --build --abort-on-container-exit --exit-code-from frontend-e2e frontend-e2e
    
    echo "🛑 Stopping test environment..."
    docker compose -f docker-compose.test.yml --profile e2e down
    
    echo ""
    echo "✅ E2E tests completed!"
fi

echo ""
echo "=================================================="
echo "✅ All frontend tests completed successfully!"
echo "=================================================="
