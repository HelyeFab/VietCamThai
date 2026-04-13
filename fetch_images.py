#!/usr/bin/env python3
"""
Image fetcher for the travel guide.

Uses Claude API + web search to find high-quality free images from Unsplash
and Pexels for each destination, downloads them, and updates .md files.

Usage:
    python3 fetch_images.py                    # All destinations
    python3 fetch_images.py --stage 01-hanoi   # Single destination
"""

import asyncio
import argparse
import hashlib
import json
import re
import time
from pathlib import Path

import anthropic
import httpx

# ── Configuration ────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
GUIDE_DIR = BASE_DIR / "guida"
IMAGES_DIR = GUIDE_DIR / "assets" / "images"
DATA_PATH = BASE_DIR / "data" / "itinerary.json"

def load_api_key():
    env_path = BASE_DIR / ".env.local"
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("CLAUDE_API_KEY="):
                return line.split("=", 1)[1]
    raise RuntimeError("CLAUDE_API_KEY not found in .env.local")

API_KEY = load_api_key()
MODEL = "claude-sonnet-4-20250514"
MAX_CONCURRENT = 3

# Images per destination: overview gets more, others get a few
IMAGES_PER_SECTION = {
    "panoramica": 4,
    "giorno-per-giorno": 5,
    "cibo-e-cultura": 3,
    "info-pratiche": 1,
}

# ── Destination keywords for image search ────────────────────────────────────

def load_data():
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def build_image_queries(stage):
    """Build search queries for each section of a destination."""
    name = stage["name"]
    country = stage["country"]
    days = stage["stage_days"]

    # Collect key attractions from itinerary
    attractions = []
    for d in days:
        if d.get("what_to_see"):
            attractions.append(d["what_to_see"])

    attractions_text = "; ".join(attractions)

    queries = {
        "panoramica": f"""Trova {IMAGES_PER_SECTION['panoramica']} immagini di alta qualità per una panoramica di {name}, {country}.
Cerco:
- 1 foto panoramica/aerea della città o del paesaggio
- 1 foto iconica del luogo più famoso
- 1 foto di vita locale/strada/mercato
- 1 foto del paesaggio naturale o architettura tipica

Attrazioni principali: {attractions_text}""",

        "giorno-per-giorno": f"""Trova {IMAGES_PER_SECTION['giorno-per-giorno']} immagini di alta qualità per le attrazioni specifiche di {name}, {country}.
Le attrazioni da illustrare sono: {attractions_text}

Cerco una foto per ciascuna attrazione/luogo principale menzionato.""",

        "cibo-e-cultura": f"""Trova {IMAGES_PER_SECTION['cibo-e-cultura']} immagini di alta qualità del cibo tipico e della cultura di {name}, {country}.
Cerco:
- 1-2 foto di piatti tipici locali o street food
- 1 foto di mercati, templi o scene culturali""",

        "info-pratiche": f"""Trova {IMAGES_PER_SECTION['info-pratiche']} immagine di trasporti o vita pratica a {name}, {country}.
Cerco: foto di trasporto locale (tuk-tuk, barca, moto, bus) o della stazione/aeroporto.""",
    }
    return queries


# ── Claude API for image discovery ───────────────────────────────────────────

SYSTEM_PROMPT = """Sei un ricercatore di immagini per una guida di viaggio.

Il tuo compito è trovare immagini GRATUITE e di ALTA QUALITÀ da questi siti:
- **Unsplash** (https://unsplash.com) — PREFERITO, ha URL diretti
- **Pexels** (https://pexels.com)
- **Wikimedia Commons** (https://commons.wikimedia.org) — solo se trovi URL diretti ai file

REGOLE CRITICHE per gli URL:
1. Per Unsplash: cerca "unsplash [soggetto]" e trova le pagine foto. L'URL diretto dell'immagine ha formato:
   https://images.unsplash.com/photo-XXXXX?w=1200&q=80
   Dalle pagine foto Unsplash puoi ricavare questo URL.

2. Per Pexels: l'URL diretto ha formato:
   https://images.pexels.com/photos/NUMERO/pexels-photo-NUMERO.jpeg?w=1200

3. Per Wikimedia: usa URL diretti tipo:
   https://upload.wikimedia.org/wikipedia/commons/thumb/X/XX/Nome_File.jpg/1200px-Nome_File.jpg

4. NON restituire URL di pagine web — solo URL DIRETTI di immagini (.jpg, .jpeg, .png, .webp)
5. NON inventare URL — cerca davvero le immagini sul web

FORMATO OUTPUT — rispondi SOLO con un blocco JSON, nient'altro:
```json
[
  {
    "url": "https://images.unsplash.com/photo-xxx?w=1200&q=80",
    "description": "Descrizione breve in italiano",
    "source": "unsplash",
    "attribution": "Foto di Nome Autore su Unsplash"
  }
]
```"""


class ImageFinder:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=API_KEY)
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def find_images(self, query: str, stage_id: str, section: str) -> list[dict]:
        """Ask Claude to find image URLs via web search."""
        async with self.semaphore:
            loop = asyncio.get_event_loop()
            try:
                response = await loop.run_in_executor(None, lambda: self.client.messages.create(
                    model=MODEL,
                    max_tokens=4000,
                    system=SYSTEM_PROMPT,
                    tools=[{
                        "type": "web_search_20250305",
                        "name": "web_search",
                        "max_uses": 10,
                    }],
                    messages=[{"role": "user", "content": query}],
                ))
            except Exception as e:
                print(f"  ⚠ API error for {stage_id}/{section}: {e}")
                return []

        # Extract JSON from response
        text = ""
        for block in response.content:
            if block.type == "text":
                text += block.text

        # Parse JSON from the response
        images = self._extract_json(text)
        return images

    def _extract_json(self, text: str) -> list[dict]:
        """Extract JSON array from Claude's response."""
        # Try to find JSON block
        json_match = re.search(r'```(?:json)?\s*(\[[\s\S]*?\])\s*```', text)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try bare JSON array
        json_match = re.search(r'(\[\s*\{[\s\S]*?\}\s*\])', text)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        return []


# ── Image downloader ─────────────────────────────────────────────────────────

async def download_image(url: str, filepath: Path) -> bool:
    """Download a single image. Returns True on success."""
    if filepath.exists() and filepath.stat().st_size > 5000:
        return True

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://unsplash.com/",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "image" in content_type or len(resp.content) > 10000:
                    filepath.write_bytes(resp.content)
                    size_kb = len(resp.content) / 1024
                    if size_kb > 5:  # at least 5KB to be a real image
                        return True
                    else:
                        filepath.unlink(missing_ok=True)
            else:
                print(f"    HTTP {resp.status_code} for {url[:80]}")
    except Exception as e:
        print(f"    Download error: {e}")

    return False


def make_filename(stage_id: str, section: str, index: int, url: str) -> str:
    """Create a descriptive filename."""
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    ext_match = re.search(r'\.(jpg|jpeg|png|webp)', url, re.I)
    ext = ext_match.group(1).lower() if ext_match else "jpg"
    return f"{stage_id}_{section}_{index:02d}_{url_hash}.{ext}"


# ── Markdown updater ─────────────────────────────────────────────────────────

def update_markdown_images(md_path: Path, downloaded_images: list[dict]):
    """Replace old image references and add new ones to markdown file."""
    if not md_path.exists() or not downloaded_images:
        return

    content = md_path.read_text(encoding="utf-8")

    # Remove existing broken image references (Wikimedia page URLs etc.)
    # Keep lines that aren't just broken image links
    lines = content.split("\n")
    cleaned_lines = []
    for line in lines:
        # Skip lines that are just a broken wikimedia commons page link image
        if re.match(r'^\s*!\[.*?\]\(https://commons\.wikimedia\.org/wiki/.*\)\s*$', line):
            continue
        cleaned_lines.append(line)
    content = "\n".join(cleaned_lines)

    # Build image gallery block
    gallery_lines = ["\n---\n"]
    gallery_lines.append("### Galleria Fotografica\n")
    for img in downloaded_images:
        local_path = img["local_path"]
        desc = img.get("description", "")
        attribution = img.get("attribution", "")
        # Use relative path from the section's md file to assets
        rel_path = f"../assets/images/{img['stage_id']}/{img['filename']}"
        gallery_lines.append(f"![{desc}]({rel_path})")
        if attribution:
            gallery_lines.append(f"*{attribution}*\n")
        else:
            gallery_lines.append("")

    # Also replace any inline image references with local versions
    for img in downloaded_images:
        original_url = img.get("url", "")
        if original_url and original_url in content:
            rel_path = f"../assets/images/{img['stage_id']}/{img['filename']}"
            content = content.replace(original_url, rel_path)

    # Append gallery at the end
    content = content.rstrip() + "\n" + "\n".join(gallery_lines) + "\n"

    md_path.write_text(content, encoding="utf-8")


# ── Main orchestrator ────────────────────────────────────────────────────────

async def process_stage(finder: ImageFinder, stage: dict):
    """Find and download images for all sections of a destination."""
    stage_id = stage["id"]
    stage_name = stage["name"]
    print(f"\n🖼️  {stage_name} — ricerca immagini...")

    img_dir = IMAGES_DIR / stage_id
    img_dir.mkdir(parents=True, exist_ok=True)

    queries = build_image_queries(stage)

    # Run all section queries in parallel
    tasks = {
        section: finder.find_images(query, stage_id, section)
        for section, query in queries.items()
    }

    results = {}
    for section, task in tasks.items():
        results[section] = await task

    # Download all found images
    total_downloaded = 0
    for section, images in results.items():
        if not images:
            print(f"  ⚠ {section}: nessuna immagine trovata")
            continue

        downloaded_for_section = []
        for i, img in enumerate(images):
            url = img.get("url", "")
            if not url or not url.startswith("http"):
                continue

            filename = make_filename(stage_id, section, i, url)
            filepath = img_dir / filename

            success = await download_image(url, filepath)
            if success:
                img["local_path"] = str(filepath)
                img["filename"] = filename
                img["stage_id"] = stage_id
                downloaded_for_section.append(img)
                total_downloaded += 1
                desc = img.get("description", "")[:40]
                size_kb = filepath.stat().st_size / 1024
                print(f"  ✓ {section}/{filename} ({size_kb:.0f}KB) — {desc}")
            else:
                print(f"  ✗ {section}: download fallito — {url[:70]}")

        # Update the markdown file
        md_path = GUIDE_DIR / stage_id / f"{section}.md"
        if downloaded_for_section:
            update_markdown_images(md_path, downloaded_for_section)

    print(f"  📊 {stage_name}: {total_downloaded} immagini scaricate")
    return total_downloaded


async def process_planning(finder: ImageFinder):
    """Find a few images for the planning section."""
    print(f"\n🖼️  Pianificazione — ricerca immagini...")

    img_dir = IMAGES_DIR / "00-pianificazione"
    img_dir.mkdir(parents=True, exist_ok=True)

    # Just a few iconic shots for the planning pages
    query = """Trova 4 immagini iconiche del Sud-Est Asiatico per la sezione di pianificazione di una guida di viaggio:
- 1 foto panoramica del Vietnam (risaie o Ha Long Bay)
- 1 foto di Angkor Wat, Cambogia
- 1 foto di Bangkok, Thailandia (templi o skyline)
- 1 foto di street food del Sud-Est Asiatico"""

    images = await finder.find_images(query, "00-pianificazione", "planning")
    total = 0
    for i, img in enumerate(images):
        url = img.get("url", "")
        if not url or not url.startswith("http"):
            continue
        filename = make_filename("00-pianificazione", "cover", i, url)
        filepath = img_dir / filename
        success = await download_image(url, filepath)
        if success:
            total += 1
            size_kb = filepath.stat().st_size / 1024
            desc = img.get("description", "")[:40]
            print(f"  ✓ {filename} ({size_kb:.0f}KB) — {desc}")

    print(f"  📊 Pianificazione: {total} immagini scaricate")
    return total


async def build_credits_page(all_attributions: list[dict]):
    """Create a credits page for all images."""
    credits_path = GUIDE_DIR / "credits-immagini.md"
    lines = ["# Crediti Immagini\n"]
    lines.append("Tutte le immagini utilizzate in questa guida provengono da fonti gratuite ")
    lines.append("e sono utilizzate nel rispetto delle rispettive licenze.\n")
    lines.append("| Immagine | Fonte | Attribuzione |")
    lines.append("|----------|-------|-------------|")

    seen = set()
    for img in all_attributions:
        key = img.get("filename", "")
        if key in seen:
            continue
        seen.add(key)
        desc = img.get("description", "N/D")
        source = img.get("source", "N/D")
        attribution = img.get("attribution", "N/D")
        lines.append(f"| {desc} | {source} | {attribution} |")

    credits_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n✓ {credits_path.relative_to(BASE_DIR)}")


async def main():
    parser = argparse.ArgumentParser(description="Fetch images for travel guide")
    parser.add_argument("--stage", help="Process only this stage (e.g. 01-hanoi)")
    args = parser.parse_args()

    data = load_data()
    finder = ImageFinder()

    print("=" * 60)
    print("🖼️  RICERCA E DOWNLOAD IMMAGINI")
    print("   Fonti: Unsplash, Pexels, Wikimedia Commons")
    print("=" * 60)

    total_images = 0
    all_attributions = []

    stages = data["stages"]
    if args.stage:
        stages = [s for s in stages if s["id"] == args.stage]

    # Process planning section first
    if not args.stage:
        total_images += await process_planning(finder)

    # Process destinations in batches of 2
    for i in range(0, len(stages), 2):
        batch = stages[i:i+2]
        for stage in batch:
            count = await process_stage(finder, stage)
            total_images += count

    # Count actual files
    image_files = list(IMAGES_DIR.rglob("*"))
    image_files = [f for f in image_files if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
    total_size = sum(f.stat().st_size for f in image_files) / (1024 * 1024)

    print("\n" + "=" * 60)
    print(f"✅ IMMAGINI COMPLETATE!")
    print(f"   📷 {len(image_files)} immagini scaricate")
    print(f"   💾 {total_size:.1f} MB totali")
    print(f"   📁 {IMAGES_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
