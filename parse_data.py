#!/usr/bin/env python3
"""Parse the XLSX itinerary into structured JSON for agent consumption."""

import json
import openpyxl
from pathlib import Path

XLSX_PATH = Path(__file__).parent.parent.parent.parent / "Downloads" / "Vietnam_Cambogia_Thailandia_2026.xlsx"
OUTPUT_PATH = Path(__file__).parent / "data" / "itinerary.json"


def parse_roadmap(ws):
    """Parse the daily roadmap sheet."""
    days = []
    for row in ws.iter_rows(min_row=3, max_row=30, values_only=True):
        if row[0] is None:
            continue
        days.append({
            "day_number": int(row[0]),
            "date": str(row[1]),
            "location": str(row[2]),
            "country_zone": str(row[3]),
            "what_to_see": str(row[4]) if row[4] else "",
            "alternative_extra": str(row[5]) if row[5] else "",
            "transport": str(row[6]) if row[6] else "",
            "accommodation_cost": str(row[7]) if row[7] else "",
            "nights": str(row[8]) if row[8] else "",
        })
    return days


def parse_budget(ws):
    """Parse the budget sheet."""
    items = []
    for row in ws.iter_rows(min_row=3, max_row=45, values_only=True):
        if row[0] is None and row[1] is None:
            continue
        items.append({
            "category": str(row[0]) if row[0] else "",
            "item": str(row[1]) if row[1] else "",
            "min_eur": str(row[2]) if row[2] else "",
            "estimate_eur": str(row[3]) if row[3] else "",
            "max_eur": str(row[4]) if row[4] else "",
            "notes": str(row[5]) if row[5] else "",
        })
    return items


def parse_practical_notes(ws):
    """Parse the practical notes sheet."""
    notes = []
    for row in ws.iter_rows(min_row=3, max_row=36, values_only=True):
        if row[0] is None and row[1] is None:
            continue
        notes.append({
            "topic": str(row[0]) if row[0] else "",
            "info": str(row[1]) if row[1] else "",
            "action": str(row[2]) if row[2] else "",
        })
    return notes


def parse_summary(ws):
    """Parse the summary sheet."""
    stages = []
    for row in ws.iter_rows(min_row=3, max_row=15, values_only=True):
        if row[0] is None:
            continue
        stages.append({
            "dates": str(row[0]) if row[0] else "",
            "country": str(row[1]) if row[1] else "",
            "stage": str(row[2]) if row[2] else "",
            "top_attraction": str(row[3]) if row[3] else "",
            "transport_arrival": str(row[4]) if row[4] else "",
            "nights": str(row[5]) if row[5] else "",
            "cost_per_night": str(row[6]) if row[6] else "",
            "total_accommodation": str(row[7]) if row[7] else "",
        })
    return stages


# Destination stage definitions — maps stage name to day numbers and folder
DESTINATION_STAGES = [
    {"id": "01-hanoi",             "name": "Hanoi",              "days": [1, 2, 3],      "country": "Vietnam"},
    {"id": "02-baia-lan-ha",       "name": "Baia di Lan Ha",     "days": [4],             "country": "Vietnam"},
    {"id": "03-ninh-binh",         "name": "Ninh Binh",          "days": [5, 6],          "country": "Vietnam"},
    {"id": "04-phong-nha",         "name": "Phong Nha",          "days": [7, 8],          "country": "Vietnam"},
    {"id": "05-hue",               "name": "Hué",                "days": [9, 10, 11],     "country": "Vietnam"},
    {"id": "06-hoi-an",            "name": "Hoi An",             "days": [12, 13, 14],    "country": "Vietnam"},
    {"id": "07-ho-chi-minh-city",  "name": "Ho Chi Minh City",   "days": [15, 16, 17],    "country": "Vietnam"},
    {"id": "08-chau-doc-mekong",   "name": "Chau Doc & Mekong",  "days": [18],            "country": "Vietnam"},
    {"id": "09-phnom-penh",        "name": "Phnom Penh",          "days": [19, 20],        "country": "Cambogia"},
    {"id": "10-siem-reap-angkor",  "name": "Siem Reap & Angkor", "days": [21, 22, 23, 24],"country": "Cambogia"},
    {"id": "11-bangkok",           "name": "Bangkok",             "days": [25, 26, 27, 28],"country": "Thailandia"},
]


def build_stage_data(days, stages_meta):
    """Group days into destination stages with all relevant data."""
    day_map = {d["day_number"]: d for d in days}
    stages = []
    for meta in stages_meta:
        stage_days = [day_map[n] for n in meta["days"] if n in day_map]
        stages.append({
            **meta,
            "stage_days": stage_days,
        })
    return stages


def main():
    wb = openpyxl.load_workbook(str(XLSX_PATH))

    roadmap = parse_roadmap(wb["📍 Roadmap Giornaliera"])
    budget = parse_budget(wb["💰 Budget"])
    notes = parse_practical_notes(wb["📋 Note Pratiche"])
    summary = parse_summary(wb["🗺️ Riepilogo Tappe"])
    stages = build_stage_data(roadmap, DESTINATION_STAGES)

    data = {
        "trip": {
            "title": "Vietnam · Cambogia · Thailandia",
            "dates": "20 Settembre – 17 Ottobre 2026",
            "duration_days": 28,
            "travelers": 4,
        },
        "stages": stages,
        "budget": budget,
        "practical_notes": notes,
        "summary": summary,
        "all_days": roadmap,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ Parsed {len(roadmap)} days into {len(stages)} stages")
    print(f"✓ {len(budget)} budget items, {len(notes)} practical notes")
    print(f"✓ Saved to {OUTPUT_PATH}")
    return data


if __name__ == "__main__":
    main()
