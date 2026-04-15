#!/usr/bin/env python3
"""Print workflow job status for site-speak-deploy (one line: status or empty on error)."""
from __future__ import annotations

import json
import os
import subprocess
import sys

repo = os.environ.get("GITHUB_REPOSITORY", "")
run_id = os.environ.get("GITHUB_RUN_ID", "")
if not repo or not run_id:
    print("", end="")
    sys.exit(0)

cmd = [
    "gh",
    "api",
    f"repos/{repo}/actions/runs/{run_id}/jobs?per_page=100",
]
try:
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
        env={**os.environ},
    )
except OSError as e:
    print(f"deploy_probe_poll: failed to run gh: {e}", file=sys.stderr)
    print("", end="")
    sys.exit(0)

if proc.returncode != 0:
    err = (proc.stderr or proc.stdout or "").strip()[:800]
    print(f"deploy_probe_poll: gh api exit {proc.returncode}: {err}", file=sys.stderr)
    print("", end="")
    sys.exit(0)

try:
    data = json.loads(proc.stdout)
except json.JSONDecodeError as e:
    print(f"deploy_probe_poll: invalid JSON from gh: {e}", file=sys.stderr)
    print("", end="")
    sys.exit(0)

jobs = data.get("jobs") or []
target = "site-speak-deploy"
status = ""
for j in jobs:
    name = (j.get("name") or "").strip()
    if name.lower() == target.lower():
        status = (j.get("status") or "").strip()
        break

if not status and jobs:
    names = [j.get("name") for j in jobs]
    print(
        f"deploy_probe_poll: no job named {target!r}; saw: {names!r}",
        file=sys.stderr,
    )

print(status, end="")
