#!/usr/bin/env python3
"""Print workflow job status for site-speak-deploy (one line: status or empty on error)."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
run_id = os.environ.get("GITHUB_RUN_ID", "").strip()
target = (os.environ.get("DEPLOY_PROBE_PARENT_JOB_NAME") or "site-speak-deploy").strip()

if not repo or not run_id:
    print("", end="")
    sys.exit(0)

token = (os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or "").strip()
if not token:
    print("deploy_probe_poll: set GITHUB_TOKEN or GH_TOKEN", file=sys.stderr)
    print("", end="")
    sys.exit(0)

# filter=latest: only jobs from latest run attempt (re-runs).
url = (
    f"https://api.github.com/repos/{repo}/actions/runs/{run_id}/jobs"
    f"?per_page=100&filter=latest"
)
req = urllib.request.Request(
    url,
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "site-speak-deploy-probe/1.0",
    },
    method="GET",
)

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8")
except urllib.error.HTTPError as e:
    err = e.read().decode("utf-8", errors="replace")[:800]
    print(f"deploy_probe_poll: HTTP {e.code}: {err}", file=sys.stderr)
    print("", end="")
    sys.exit(0)
except OSError as e:
    print(f"deploy_probe_poll: request failed: {e}", file=sys.stderr)
    print("", end="")
    sys.exit(0)

try:
    data = json.loads(body)
except json.JSONDecodeError as e:
    print(f"deploy_probe_poll: invalid JSON: {e}", file=sys.stderr)
    print("", end="")
    sys.exit(0)

jobs = data.get("jobs") or []
status = ""
tl = target.lower()
for j in jobs:
    name = (j.get("name") or "").strip()
    if not name:
        continue
    nl = name.lower()
    if nl == tl or tl in nl:
        status = (j.get("status") or "").strip()
        break

if not status and jobs:
    summary = [(j.get("name"), j.get("status")) for j in jobs]
    print(f"deploy_probe_poll: no job matching {target!r}; jobs={summary!r}", file=sys.stderr)

print(status, end="")
