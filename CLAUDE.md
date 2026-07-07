# VietCamThai Travel Guide

AI-generated travel guide for Vietnam, Cambodia, and Thailand — 31 days, 1–31 October 2026, 4 travelers. Route runs Bangkok → Siem Reap → Koh Rong Samloem → Phnom Penh → Chau Doc → HCMC → Hoi An → Hué → Phong Nha → Ninh Binh → Lan Ha → Hanoi (reversed from the original Hanoi-first plan).

**Bilingual (IT + EN).** The site serves both languages under locale-prefixed routes (`/it/…`, `/en/…`) with a language switcher; Italian is primary. Content lives in `guida/it/` and `guida/en/` (mirrored trees). UI/data strings and locale routing live in `web/src/lib/i18n.ts` and `web/src/app/[lang]/`. `/` emits a static redirect (`web/scripts/emit-root-redirect.ts`, run as `postbuild`) to the visitor's language. **When you edit content, update BOTH `guida/it/<stop>/…` and `guida/en/<stop>/…`** (or translate the IT change into EN).

## Project Structure

```
VietCamThai/
├── guida/                    # Source markdown content — BILINGUAL (it + en)
│   ├── it/                   # Italian content (primary, authored)
│   │   ├── 00-pianificazione/    # 6 planning files (budget, visas, health, etc.)
│   │   ├── 01-hanoi/ ... 12-koh-rong-samloem/  # 12 destinations, 4 files each
│   │   │   ├── panoramica.md
│   │   │   ├── giorno-per-giorno.md
│   │   │   ├── cibo-e-cultura.md
│   │   │   └── info-pratiche.md
│   │   └── README.md
│   ├── en/                   # English content — mirror of it/ (same tree, translated)
│   └── assets/images/        # Downloaded images per destination (shared, locale-agnostic)
├── data/
│   └── itinerary.json        # Structured trip data (stages, days, costs)
├── web/                      # Next.js 16 static site
│   ├── src/app/              # App Router pages
│   ├── src/components/       # React components
│   ├── src/lib/              # Content pipeline, markdown parser, coordinates
│   ├── scripts/              # Prebuild: copy-images, build-search-index
│   └── public/               # Static assets, PWA manifest, icons
├── parse_data.py             # XLSX → data/itinerary.json (run after editing the Excel roadmap)
├── generate_guide.py         # Multi-agent content generator (Claude API + web search)
├── fetch_images.py           # Image fetcher from Unsplash/Pexels/Wikimedia
├── vercel.json               # Vercel deployment config (builds from root)
└── .env.local                # Claude API key (gitignored)
```

## Tech Stack

- **Content**: Markdown files parsed with unified/remark/rehype pipeline
- **Website**: Next.js 16, Tailwind CSS v4, Lucide icons, static export
- **Map**: Leaflet + OpenStreetMap (dynamic import, SSR disabled)
- **Search**: Client-side full-text search via pre-built JSON index
- **Dark mode**: CSS custom properties toggled via `.dark` class, dark is default
- **Deploy**: Vercel static hosting, auto-deploys from GitHub `main` branch
- **URL**: https://vietcamthai-guida.vercel.app

## Key Files

- `web/src/lib/content.ts` — reads markdown files and itinerary.json at build time
- `web/src/lib/markdown.ts` — remark/rehype pipeline, image URL rewriting, heading extraction
- `web/src/lib/coordinates.ts` — destination metadata, lat/lng, planning sections, section tabs
- `web/src/app/globals.css` — Tailwind theme (light/dark CSS variables), prose typography
- `guida/` — the actual guide content. Edit these .md files to change what appears on the site

## Build & Deploy

```bash
cd web
npm run dev          # Local dev server (runs prebuild automatically)
npm run build        # Static export to web/out/
```

Push to `main` branch auto-deploys to Vercel. Or manually: `vercel deploy --prod` from project root.

## Content Generation

The guide was generated using `generate_guide.py` which calls Claude API (Sonnet) with web search. To regenerate:

```bash
# Set CLAUDE_API_KEY in .env.local
python3 generate_guide.py                    # All destinations + planning
python3 generate_guide.py --stage 01-hanoi   # Single destination
python3 generate_guide.py --planning-only    # Only planning section
```

Images were curated using `web/scripts/replace-images.ts` which searches Wikimedia Commons API for location-specific photos. Hero images on destination cards come from the first `![](url)` in each `panoramica.md`.

---

## How to Change Travel Plans

### Change dates or activities for an existing destination

1. Edit the relevant `.md` file in `guida/{destination}/`:
   - `panoramica.md` — overview, history, why visit
   - `giorno-per-giorno.md` — day-by-day itinerary with times and prices
   - `cibo-e-cultura.md` — restaurants, dishes, cultural tips
   - `info-pratiche.md` — transport, accommodation, safety
2. Update `data/itinerary.json` if dates/days changed (the `stage_days` array for the destination). If you edited the source Excel roadmap, just run `python3 parse_data.py` to regenerate it (auto-finds the newest `Vietnam_Cambogia_Thailandia_2026*.xlsx` in `~/Downloads`; pass `--xlsx` for an explicit path). Note: stage order, names and the Koh Rong Samloem mapping are defined in `parse_data.py` (`STAGE_ORDER` / `STAGE_META`); keep `web/src/lib/coordinates.ts` `DESTINATIONS` in sync.
3. Rebuild: `cd web && npm run build` or just push to GitHub

### Add a new destination

1. Create a new folder in `guida/` (e.g. `guida/12-chiang-mai/`)
2. Add the 4 markdown files: `panoramica.md`, `giorno-per-giorno.md`, `cibo-e-cultura.md`, `info-pratiche.md`
3. Add the destination to `data/itinerary.json` in the `stages` array
4. Add it to `web/src/lib/coordinates.ts`:
   - Add entry to `DESTINATIONS` array (with id, name, lat, lng, country, days, dates)
5. Rebuild and deploy

### Remove a destination

1. Delete its folder from `guida/`
2. Remove it from `data/itinerary.json` `stages` array
3. Remove it from `DESTINATIONS` in `web/src/lib/coordinates.ts`
4. Rebuild and deploy

### Change number of days at a destination

1. Edit `guida/{destination}/giorno-per-giorno.md` — add or remove day sections
2. Update `data/itinerary.json` — adjust the `days` array and `stage_days` entries
3. Update `web/src/lib/coordinates.ts` — change the `days` and `dates` fields
4. Rebuild and deploy

### Re-generate content for a destination using AI

```bash
# Re-run the agent for a specific destination
python3 generate_guide.py --stage 05-hue --skip-planning

# Then fix images for that destination
cd web && npx tsx scripts/replace-images.ts
```

### Swap the hero image for a destination card

The hero image is the first `![alt](url)` found in `guida/{destination}/panoramica.md`. To change it, move or replace the first image reference in that file.

### Update budget or practical info

Edit the relevant file in `guida/00-pianificazione/`:
- `budget.md` — costs breakdown
- `documenti-e-visti.md` — passports, visas, insurance
- `salute-e-sicurezza.md` — vaccines, pharmacy, emergencies
- `app-e-connettivita.md` — apps, SIM cards, offline maps
- `meteo-e-bagaglio.md` — weather forecast, packing list
- `consigli-generali.md` — general travel tips
