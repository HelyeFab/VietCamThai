#!/usr/bin/env python3
"""Parse the XLSX itinerary into structured JSON (data/itinerary.json).

The "Roadmap Giornaliera" sheet drives everything. Note the 2026 revision:
  - the trip runs Bangkok -> ... -> Hanoi (reversed from the original Hanoi-first plan)
  - dates are 1-31 October 2026 (31 days)
  - a 2-night island stop (Koh Rong Samloem) sits between Siem Reap and Phnom Penh
  - column A ("ORDIN") is now a stage ordinal, NOT a day number, so day numbers
    are assigned sequentially by row order
  - the Riepilogo Tappe / Budget sheets in the workbook may be STALE — the summary
    here is regenerated from the roadmap, not read from that sheet

Usage:
    python3 parse_data.py                      # auto-find newest matching xlsx in ~/Downloads
    python3 parse_data.py --xlsx /path/to.xlsx # explicit workbook
"""

import argparse
import datetime
import json
import unicodedata
from pathlib import Path

import openpyxl

OUTPUT_PATH = Path(__file__).parent / "data" / "itinerary.json"
DOWNLOADS = Path.home() / "Downloads"

# The authoritative roadmap moved (Aug 2026). It is now a sheet inside the trip
# concierge's synced workbook, which is also the Google Sheet the user edits.
# READ-ONLY — never write to this file.
TRIP_XLSX = (Path.home() / "Documents" / "SyncFolder" / "VietThaiCam" /
             "00-Trip-Wide" / "Master_Itinerary_Budget_Notes.xlsx")
SHEET_NAME = "Proposta di Nuova📍 Roadmap Gio"
LEGACY_SHEET = "📍 Roadmap Giornaliera"   # superseded; kept only as a fallback

TRIP_START = datetime.date(2026, 10, 1)
MONTH_ABBR_IT = {"GEN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAG": 5, "GIU": 6,
                 "LUG": 7, "AGO": 8, "SET": 9, "OTT": 10, "NOV": 11, "DIC": 12}
MONTHS = {1: "Gen", 2: "Feb", 3: "Mar", 4: "Apr", 5: "Mag", 6: "Giu",
          7: "Lug", 8: "Ago", 9: "Set", 10: "Ott", 11: "Nov", 12: "Dic"}
MONTHS_FULL = {"Gen": "Gennaio", "Feb": "Febbraio", "Mar": "Marzo", "Apr": "Aprile",
               "Mag": "Maggio", "Giu": "Giugno", "Lug": "Luglio", "Ago": "Agosto",
               "Set": "Settembre", "Ott": "Ottobre", "Nov": "Novembre", "Dic": "Dicembre"}

# location substring -> stage id (folder). Order matters: more specific first.
LOC_TO_STAGE = [
    ("KOH RONG", "12-koh-rong-samloem"),
    ("SIHANOUK", "12-koh-rong-samloem"),
    ("BANGKOK", "11-bangkok"),
    ("SIEM REAP", "10-siem-reap-angkor"),
    ("PHNOM PENH", "09-phnom-penh"),
    ("CHAU DOC", "08-chau-doc-mekong"),
    ("HO CHI MINH", "07-ho-chi-minh-city"),
    ("HOI AN", "06-hoi-an"),
    ("PHONG NHA", "04-phong-nha"),
    ("NINH BINH", "03-ninh-binh"),
    ("LAN HA", "02-baia-lan-ha"),
    ("HANOI", "01-hanoi"),
]

# id -> (display name, country)
STAGE_META = {
    "11-bangkok":          ("Bangkok",            "Thailandia"),
    "10-siem-reap-angkor": ("Siem Reap & Angkor", "Cambogia"),
    "12-koh-rong-samloem": ("Koh Rong Samloem",   "Cambogia"),
    "09-phnom-penh":       ("Phnom Penh",         "Cambogia"),
    "08-chau-doc-mekong":  ("Chau Doc & Mekong",  "Vietnam"),
    "07-ho-chi-minh-city": ("Ho Chi Minh City",   "Vietnam"),
    "06-hoi-an":           ("Hoi An",             "Vietnam"),
    "04-phong-nha":        ("Phong Nha",          "Vietnam"),
    "03-ninh-binh":        ("Ninh Binh",          "Vietnam"),
    "02-baia-lan-ha":      ("Baia di Lan Ha",     "Vietnam"),
    "01-hanoi":            ("Hanoi",              "Vietnam"),
}

# travel order (first-visited -> last)
# Hué was REMOVED from the trip on 17 Jul 2026 (confirmed 28 Jul): Hoi An now runs
# direct to Phong Nha over the Hai Van Pass, and Hué's 3 nights went to Phong Nha (4)
# and Ninh Binh (3). Do not re-add it.
STAGE_ORDER = [
    "11-bangkok", "10-siem-reap-angkor", "12-koh-rong-samloem", "09-phnom-penh",
    "08-chau-doc-mekong", "07-ho-chi-minh-city", "06-hoi-an",
    "04-phong-nha", "03-ninh-binh", "02-baia-lan-ha", "01-hanoi",
]


def find_xlsx() -> Path:
    """Prefer the trip folder's workbook (the live Google Sheet, synced by Insync);
    fall back to an old download if it is ever missing."""
    if TRIP_XLSX.exists():
        return TRIP_XLSX
    matches = sorted(DOWNLOADS.glob("Vietnam_Cambogia_Thailandia_2026*.xlsx"),
                     key=lambda p: p.stat().st_mtime, reverse=True)
    if not matches:
        raise FileNotFoundError(
            f"Roadmap workbook not found at {TRIP_XLSX} and no "
            f"Vietnam_Cambogia_Thailandia_2026*.xlsx in {DOWNLOADS}")
    return matches[0]


def _norm(s: str) -> str:
    """Uppercase and strip accents — the new sheet writes Châu Đốc, Hội An, Ninh Bình."""
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace("Đ", "D").replace("đ", "d").upper()


def stage_for(loc: str) -> str:
    """Map a roadmap location cell to a stage id.

    Travel rows are written 'A → B' (sometimes 'A → B → C'); the stage is where the
    day ENDS, so match on the segment after the last arrow.
    """
    u = _norm(loc).replace("->", "→")
    # Try the last segment first, then walk backwards: the final day reads
    # 'Hanoi → Rientro' (the flight home), which still belongs to Hanoi.
    segments = [s.strip() for s in u.split("→") if s.strip()] or [u.strip()]
    for seg in reversed(segments):
        for key, sid in LOC_TO_STAGE:
            if _norm(key) in seg:
                return sid
    raise ValueError(f"no stage mapping for location {loc!r}")


def to_date(value):
    """The sheet mixes real datetimes (rows 2-17) with strings like '13-Ott'."""
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    txt = str(value).strip()
    if "-" in txt:
        d, _, mon = txt.partition("-")
        month = MONTH_ABBR_IT.get(_norm(mon)[:3])
        if month and d.strip().isdigit():
            return datetime.date(2026, month, int(d.strip()))
    return None


def fmt_date(value) -> str:
    d = to_date(value)
    if d:
        return f"{d.day} {MONTHS.get(d.month, d.month)}"
    return str(value)


def parse_roadmap(ws):
    """Daily roadmap. Header is row 1; data from row 2.

    Day numbers come from the DATE (day 1 = 1 October 2026), not from row order:
    the new sheet spends several rows on a single travel day (e.g. 8 Oct has a flight
    row, a ferry row and an island row), and numbering by row would invent extra days.
    Rows sharing a date are merged; the LAST row for a date wins the location, because
    that is where the day ends.
    """
    by_date = {}
    order = []
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
        if row[1] is None:  # no date -> blank/spacer row
            continue
        d = to_date(row[1])
        if d is None:
            continue
        cell = lambda i: str(row[i]).strip() if len(row) > i and row[i] else ""
        if d not in by_date:
            by_date[d] = {
                "day_number": (d - TRIP_START).days + 1,
                "date": fmt_date(row[1]),
                "location": "", "country_zone": "", "what_to_see": "",
                "alternative_extra": "", "transport": "", "accommodation_cost": "",
                "nights": "",
            }
            order.append(d)
        rec = by_date[d]
        if cell(2):
            rec["location"] = cell(2)          # last row of the date wins
        for key, idx in (("country_zone", 3), ("what_to_see", 4),
                         ("alternative_extra", 5), ("transport", 6)):
            v = cell(idx)
            if v and v not in rec[key]:
                rec[key] = f"{rec[key]}. {v}" if rec[key] else v
        for key, idx in (("accommodation_cost", 7), ("nights", 8)):
            if cell(idx):
                rec[key] = cell(idx)
    return [by_date[d] for d in sorted(order)]


def build_stages(days):
    """Group days into destination stages, in travel order."""
    for d in days:
        d["_stage"] = stage_for(d["location"])
    stages = []
    for sid in STAGE_ORDER:
        sdays = [d for d in days if d.get("_stage") == sid]
        if not sdays:
            raise ValueError(f"no days mapped to stage {sid}")
        name, country = STAGE_META[sid]
        stages.append({
            "id": sid,
            "name": name,
            "days": [d["day_number"] for d in sdays],
            "country": country,
            "stage_days": sdays,
        })
    for d in days:
        d.pop("_stage", None)
    return stages


def date_range(sdays):
    a, b = sdays[0]["date"], sdays[-1]["date"]
    return a if a == b else f"{a.split()[0]}–{b}"


def build_summary(stages):
    """Regenerate the per-stage summary from the roadmap (the workbook sheet is stale)."""
    summary = []
    for st in stages:
        sd = st["stage_days"]
        summary.append({
            "dates": date_range(sd),
            "country": st["country"],
            "stage": st["name"],
            "top_attraction": sd[0]["what_to_see"][:60],
            "transport_arrival": sd[0]["transport"][:60],
            "nights": str(len(sd)),
        })
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", type=Path, default=None, help="path to the workbook")
    args = ap.parse_args()

    xlsx = args.xlsx or find_xlsx()
    wb = openpyxl.load_workbook(str(xlsx))

    sheet = SHEET_NAME if SHEET_NAME in wb.sheetnames else LEGACY_SHEET
    if sheet == LEGACY_SHEET:
        print(f"⚠️  '{SHEET_NAME}' not found — falling back to the SUPERSEDED "
              f"'{LEGACY_SHEET}' sheet. Check the workbook.")
    roadmap = parse_roadmap(wb[sheet])
    stages = build_stages(roadmap)
    summary = build_summary(stages)

    # Budget and practical notes live in the markdown (guida/00-pianificazione/*.md);
    # the workbook's Budget/Note sheets are stale, so they are intentionally not emitted here.
    first, last = roadmap[0]["date"], roadmap[-1]["date"]
    trip_dates = f"{first.split()[0]} – {last.split()[0]} {MONTHS_FULL[last.split()[1]]} 2026"
    data = {
        "trip": {
            "title": "Vietnam · Cambogia · Thailandia",
            "dates": trip_dates,
            "duration_days": len(roadmap),
            "travelers": 4,
        },
        "stages": stages,
        "summary": summary,
        "all_days": roadmap,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ Parsed {xlsx.name}")
    print(f"✓ {len(roadmap)} days into {len(stages)} stages, "
          f"trip {data['trip']['dates']}")
    for st in stages:
        print(f"    {st['id']:<22} {st['name']:<20} days {st['days']}  ({date_range(st['stage_days'])})")
    print(f"✓ Saved to {OUTPUT_PATH}")
    return data


if __name__ == "__main__":
    main()
