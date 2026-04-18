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
export DEPLOY_PROBE_MAX_WAIT="${DEPLOY_PROBE_MAX_WAIT:-180}"

: >"$DEPLOY_PROBE_OUT"

python3 "$GITHUB_WORKSPACE/tools/deploy_probe_http.py" &
PROBE_PID=$!

poll_s=5
# Wall-clock cap: old logic used "elapsed += poll_s" only, so slow polls (each up to 60s HTTP)
# did not count — the step could run far longer than DEPLOY_PROBE_MAX_WAIT.
SECONDS=0
while true; do
  status="$(python3 "$GITHUB_WORKSPACE/tools/deploy_probe_poll_status.py")"
  if [[ "$status" == "completed" ]]; then
    break
  fi
  if ((SECONDS >= DEPLOY_PROBE_MAX_WAIT)); then
    echo "Timeout waiting for site-speak-deploy (${DEPLOY_PROBE_MAX_WAIT}s wall clock)" >&2
    kill -TERM "$PROBE_PID" 2>/dev/null || true
    for _ in $(seq 1 90); do
      if ! kill -0 "$PROBE_PID" 2>/dev/null; then
        wait "$PROBE_PID" 2>/dev/null || true
        break
      fi
      sleep 1
    done
    kill -KILL "$PROBE_PID" 2>/dev/null || true
    wait "$PROBE_PID" 2>/dev/null || true
    exit 1
  fi
  sleep "$poll_s"
done

kill -TERM "$PROBE_PID" 2>/dev/null || true
for _ in $(seq 1 90); do
  if ! kill -0 "$PROBE_PID" 2>/dev/null; then
    wait "$PROBE_PID" 2>/dev/null || true
    break
  fi
  sleep 1
done
kill -KILL "$PROBE_PID" 2>/dev/null || true
wait "$PROBE_PID" 2>/dev/null || true

lines="$(wc -l <"$DEPLOY_PROBE_OUT" | tr -d ' ')"
echo "Collected ${lines} probe lines"

export DEPLOY_PROBE_OTLP_LOGS_ENDPOINT="https://${COLLECTOR_HOST}/v1/logs"
export DEPLOY_PROBE_TARGET_URL

# OTLP export can hang on network; cap wall time so the Actions step cannot run unbounded.
timeout 15m dotnet run --project "$GITHUB_WORKSPACE/tools/DeployProbeLog/DeployProbeLog.csproj" -c Release --no-build -- "$DEPLOY_PROBE_OUT"

# Count failures for informational logging only — probe failures are data, not a CI error.
# The job only fails if the probe machinery itself breaks (script error, dotnet crash, collector unreachable).
fail_count=0
if [[ -s "$DEPLOY_PROBE_OUT" ]]; then
  fail_count=$(grep -cE '"ok"\s*:\s*false' "$DEPLOY_PROBE_OUT" || true)
fi
ok_count=$(( lines - fail_count ))
echo "Probe summary: ${ok_count} ok, ${fail_count} failed out of ${lines} total (see Loki: service_name=DeploySyntheticProbe)"
if (( fail_count > 0 )); then
  echo "::warning::${fail_count} probe request(s) failed during the deploy window — check the dashboard for details."
fi
