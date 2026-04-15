#!/usr/bin/env python3
"""
Synthetic HTTP probe: enqueue ~DEPLOY_PROBE_RPS requests/sec until SIGTERM/SIGINT.
Each result is one NDJSON line appended to DEPLOY_PROBE_OUT (stdlib urllib only).
"""
from __future__ import annotations

import json
import os
import signal
import threading
import time
from queue import Empty, Queue
from urllib import error, request

_target = os.environ["DEPLOY_PROBE_TARGET_URL"]
_out_path = os.environ["DEPLOY_PROBE_OUT"]
_rps = float(os.environ.get("DEPLOY_PROBE_RPS", "100"))

_stop = threading.Event()
_file_lock = threading.Lock()


def _handle_stop(_signum, _frame) -> None:
    _stop.set()


def _one_request() -> None:
    t0 = time.perf_counter()
    code = 0
    ok = False
    err = ""
    try:
        req = request.Request(
            _target,
            method="GET",
            headers={"User-Agent": "site-speak-deploy-synthetic-probe/1.0"},
        )
        with request.urlopen(req, timeout=20) as resp:
            code = resp.status
            ok = 200 <= code < 400
    except error.HTTPError as e:
        code = e.code
        ok = False
        err = (e.reason or str(e.code))[:500]
    except Exception as e:
        code = 0
        ok = False
        err = (type(e).__name__ + ": " + str(e))[:500]
    dt_ms = round((time.perf_counter() - t0) * 1000.0, 3)
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    line = json.dumps(
        {"ts": ts, "ok": ok, "status_code": code, "latency_ms": dt_ms, "error": err},
        separators=(",", ":"),
    )
    with _file_lock:
        with open(_out_path, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def _producer(q: Queue) -> None:
    rps = max(0.1, min(_rps, 500.0))
    interval = 1.0 / rps
    next_fire = time.monotonic()
    while not _stop.is_set():
        try:
            q.put(object(), block=False)
        except Exception:
            time.sleep(0.01)
            continue
        next_fire += interval
        sleep_s = next_fire - time.monotonic()
        if sleep_s > 0:
            time.sleep(sleep_s)
        elif sleep_s < -2.0:
            next_fire = time.monotonic()


def _worker(q: Queue) -> None:
    while True:
        if _stop.is_set() and q.empty():
            return
        try:
            q.get(timeout=0.4)
        except Empty:
            continue
        try:
            _one_request()
        finally:
            q.task_done()


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_stop)
    signal.signal(signal.SIGINT, _handle_stop)

    if not _target or not _out_path:
        import sys

        print("DEPLOY_PROBE_TARGET_URL and DEPLOY_PROBE_OUT are required", file=sys.stderr)
        raise SystemExit(2)

    parent = os.path.dirname(os.path.abspath(_out_path))
    if parent:
        os.makedirs(parent, exist_ok=True)
    open(_out_path, "w", encoding="utf-8").close()

    rps = max(0.1, min(_rps, 500.0))
    workers = min(120, max(15, int(rps * 1.5)))
    q: Queue = Queue(maxsize=max(300, int(rps * 15)))

    prod = threading.Thread(target=_producer, args=(q,), daemon=True)
    prod.start()
    pool = [threading.Thread(target=_worker, args=(q,), daemon=True) for _ in range(workers)]
    for t in pool:
        t.start()

    prod.join()
    _stop.set()
    for t in pool:
        t.join(timeout=120)


if __name__ == "__main__":
    main()
