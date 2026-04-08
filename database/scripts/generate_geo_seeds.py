#!/usr/bin/env python3
"""
Regenerate 1-seed_supplier.sql and 2-seed_equipment.sql from CSVs with geocoded lat/lon.
Uses OpenStreetMap Nominatim (1 req/s). Set GEOCODE_CACHE to reuse results.

  cd database/scripts && python3 generate_geo_seeds.py

Requires: stdlib only.
"""
from __future__ import annotations

import csv
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent.parent
CACHE_PATH = DB_DIR / "geocode_cache.json"
USER_AGENT = "SiteSpeakSeedGenerator/1.0 (class project; contact local admin)"
NOMINATIM = "https://nominatim.openstreetmap.org/search"

# Nominatim occasionally misses a street; try an alternate query (same city).
ADDRESS_QUERY_OVERRIDES: dict[str, str] = {
    "2455 Pinedale Dr, Idaho Falls, ID 83401": "Idaho Falls, ID 83401",
}


def parse_phones_from_existing_seed(sql_path: Path) -> dict[str, str]:
    """Extract ('name', 'address', 'phone') tuples from current supplier seed."""
    phones: dict[str, str] = {}
    if not sql_path.exists():
        return phones
    text = sql_path.read_text(encoding="utf-8")
    # Match rows like: ('Name', 'addr', '(801) 555-0123'),
    pattern = re.compile(
        r"\(\s*'((?:[^']|'')+)'\s*,\s*'((?:[^']|'')+)'\s*,\s*'((?:[^']|'')+)'\s*\)"
    )
    for m in pattern.finditer(text):
        name = m.group(1).replace("''", "'")
        phone = m.group(3).replace("''", "'")
        phones[name] = phone
    return phones


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def load_cache() -> dict[str, tuple[float, float]]:
    if not CACHE_PATH.exists():
        return {}
    data = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    out: dict[str, tuple[float, float]] = {}
    for k, v in data.items():
        out[k] = (float(v[0]), float(v[1]))
    return out


def save_cache(cache: dict[str, tuple[float, float]]) -> None:
    CACHE_PATH.write_text(
        json.dumps({k: [lat, lon] for k, (lat, lon) in cache.items()}, indent=0),
        encoding="utf-8",
    )


def geocode_once(query: str) -> tuple[float, float] | None:
    q = urllib.parse.urlencode(
        {"q": query, "format": "json", "limit": "1", "addressdetails": "0"}
    )
    url = f"{NOMINATIM}?{q}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode())
            break
        except (urllib.error.URLError, TimeoutError, OSError) as ex:
            last_err = ex
            time.sleep(2.0 * (attempt + 1))
    else:
        raise RuntimeError(f"Geocode request failed after retries: {last_err}") from last_err
    time.sleep(1.1)
    if not body:
        return None
    return float(body[0]["lat"]), float(body[0]["lon"])


def geocode(address: str, cache: dict[str, tuple[float, float]]) -> tuple[float, float]:
    if address in cache:
        return cache[address]
    query = ADDRESS_QUERY_OVERRIDES.get(address, address)
    coords = geocode_once(query)
    if coords is None:
        coords = geocode_once(query + ", USA")
    if coords is None and query != address:
        coords = geocode_once(address)
        if coords is None:
            coords = geocode_once(address + ", USA")
    if coords is None:
        parts = [p.strip() for p in address.split(",") if p.strip()]
        for n in (3, 2):
            if len(parts) >= n:
                tail = ", ".join(parts[-n:])
                coords = geocode_once(tail)
                if coords is not None:
                    break
                coords = geocode_once(tail + ", USA")
                if coords is not None:
                    break
    if coords is None:
        raise RuntimeError(f"No geocode result for: {address}")
    lat, lon = coords
    cache[address] = (lat, lon)
    return lat, lon


def main() -> int:
    suppliers_csv = DB_DIR / "suppliers.csv"
    equipment_csv = DB_DIR / "equipment_price_list.csv"
    out_suppliers = DB_DIR / "1-seed_supplier.sql"
    out_equipment = DB_DIR / "2-seed_equipment.sql"
    phones_json = DB_DIR / "supplier_phones.json"

    if phones_json.exists():
        phones = json.loads(phones_json.read_text(encoding="utf-8"))
    else:
        phones = parse_phones_from_existing_seed(out_suppliers)
        if phones:
            phones_json.write_text(json.dumps(phones, indent=0), encoding="utf-8")
    cache = load_cache()

    rows: list[tuple[str, str, str, float, float]] = []
    with suppliers_csv.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("supplier_name"):
                continue
            parts = line.split(",", 1)
            if len(parts) < 2:
                continue
            name, addr = parts[0].strip(), parts[1].strip()
            if not name or not addr:
                continue
            phone = phones.get(name, "(000) 555-0000")
            try:
                lat, lon = geocode(addr, cache)
            except Exception as ex:
                print(f"FAIL {name}: {ex}", file=sys.stderr)
                return 1
            rows.append((name, addr, phone, lat, lon))
            save_cache(cache)

    save_cache(cache)

    lines = [
        "-- Seed data for the supplier table",
        "-- Generated from suppliers.csv + generate_geo_seeds.py (Nominatim)",
        "",
        "INSERT INTO supplier (name, address, phone, latitude, longitude) VALUES",
    ]
    value_lines = []
    for name, addr, phone, lat, lon in rows:
        value_lines.append(
            f"  ({sql_str(name)}, {sql_str(addr)}, {sql_str(phone)}, {lat:.7f}, {lon:.7f})"
        )
    lines.append(",\n".join(value_lines) + ";")
    out_suppliers.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out_suppliers} ({len(rows)} suppliers)")

    # Equipment: map place_to_rent_from -> supplier name (subquery)
    eq_lines = [
        "-- Seed data for the equipment table",
        "-- Generated from equipment_price_list.csv + generate_geo_seeds.py",
        "",
        "INSERT INTO equipment (name, cost_per_day, cost_half_day, rental_supplier_id) VALUES",
    ]
    ev: list[str] = []
    with equipment_csv.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            vname = (r.get("vehicle_type") or "").strip()
            cday = r.get("cost_per_day", "").strip()
            chalf = r.get("cost_half_day", "").strip()
            place = (r.get("place_to_rent_from") or "").strip()
            if not vname or not place:
                continue
            ev.append(
                f"  ({sql_str(vname)}, {cday}, {chalf}, "
                f"(SELECT id FROM supplier WHERE name = {sql_str(place)} AND deleted_at IS NULL LIMIT 1))"
            )
    eq_lines.append(",\n".join(ev) + ";")
    out_equipment.write_text("\n".join(eq_lines) + "\n", encoding="utf-8")
    print(f"Wrote {out_equipment} ({len(ev)} equipment)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
