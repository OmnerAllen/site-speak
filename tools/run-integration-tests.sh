#!/usr/bin/env bash
# Start Postgres (schema + seeds), wait until healthy, run full solution tests, then tear down.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.integration.yml)

cleanup() {
  "${COMPOSE[@]}" down -v --remove-orphans || true
}
trap cleanup EXIT

"${COMPOSE[@]}" up -d --wait integration-db

export INTEGRATION_TEST_CONNECTION_STRING='Host=127.0.0.1;Port=5434;Database=sitespeak;Username=postgres;Password=postgres'
export OTEL_SDK_DISABLED=true

dotnet test site-speak.sln -c Release --verbosity minimal
