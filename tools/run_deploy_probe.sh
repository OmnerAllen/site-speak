#!/usr/bin/env bash
# Run synthetic HTTP probe until sibling job "site-speak-deploy" completes, then ship NDJSON to OTLP.
set -euo pipefail

: "${GITHUB_REPOSITORY:?}"
: "${GITHUB_RUN_ID:?}"
: "${GITHUB_WORKSPACE:?}"
: "${APP_HOST:?}"
: "${COLLECTOR_HOST:?}"

export DEPLOY_PROBE_TARGET_URL="https://${APP_HOST}/"
export DEPLOY_PROBE_OUT="${RUNNER_TEMP:-/tmp}/deploy-probe-${GITHUB_RUN_ID}.ndjson"
export DEPLOY_PROBE_RPS="${DEPLOY_PROBE_RPS:-80}"
export DEPLOY_PROBE_MAX_WAIT="${DEPLOY_PROBE_MAX_WAIT:-3600}"

: >"$DEPLOY_PROBE_OUT"

python3 "$GITHUB_WORKSPACE/tools/deploy_probe_http.py" &
PROBE_PID=$!

poll_s=10
elapsed=0
while true; do
  status="$(
    gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/jobs" --paginate \
      --jq '.jobs[] | select(.name=="site-speak-deploy") | .status' 2>/dev/null | head -1 || true
  )"
  if [[ "$status" == "completed" ]]; then
    break
  fi
  if [[ "$elapsed" -ge "$DEPLOY_PROBE_MAX_WAIT" ]]; then
    echo "Timeout waiting for site-speak-deploy (${DEPLOY_PROBE_MAX_WAIT}s)" >&2
    kill -TERM "$PROBE_PID" 2>/dev/null || true
    wait "$PROBE_PID" 2>/dev/null || true
    exit 1
  fi
  sleep "$poll_s"
  elapsed=$((elapsed + poll_s))
done

kill -TERM "$PROBE_PID" 2>/dev/null || true
wait "$PROBE_PID" 2>/dev/null || true

lines="$(wc -l <"$DEPLOY_PROBE_OUT" | tr -d ' ')"
echo "Collected ${lines} probe lines"

export DEPLOY_PROBE_OTLP_LOGS_ENDPOINT="https://${COLLECTOR_HOST}/v1/logs"
export DEPLOY_PROBE_TARGET_URL

dotnet run --project "$GITHUB_WORKSPACE/tools/DeployProbeLog/DeployProbeLog.csproj" -c Release --no-build -- "$DEPLOY_PROBE_OUT"

if [[ -s "$DEPLOY_PROBE_OUT" ]] && grep -qE '"ok"\s*:\s*false' "$DEPLOY_PROBE_OUT"; then
  echo "::error::Synthetic probe recorded one or more failed requests (see Loki: service_name=DeploySyntheticProbe)."
  exit 1
fi
