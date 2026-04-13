#!/usr/bin/env python3
"""
Multi-agent travel guide generator.

Uses Claude API with web search to research each destination and generate
a comprehensive Italian-language travel guide in Markdown.

Usage:
    python3 generate_guide.py                  # Generate everything
    python3 generate_guide.py --stage 01-hanoi # Generate a single stage
    python3 generate_guide.py --planning-only  # Only planning section
    python3 generate_guide.py --skip-images    # Skip image download
"""

import asyncio
import json
import os
import re
import sys
import time
import argparse
import hashlib
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

import anthropic
import httpx

# ── Configuration ────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
GUIDE_DIR = BASE_DIR / "guida"
IMAGES_DIR = GUIDE_DIR / "assets" / "images"
DATA_PATH = BASE_DIR / "data" / "itinerary.json"

# Load API key from .env.local
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
MAX_CONCURRENT = 4  # max parallel API calls
MAX_WEB_SEARCH_USES = 8  # per agent call

# ── Data loading ─────────────────────────────────────────────────────────────

def load_data():
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)

# ── Claude API client ────────────────────────────────────────────────────────

@dataclass
class AgentResult:
    role: str
    stage_id: str
    content: str
    search_queries: list[str]
    image_urls: list[str]


class TravelGuideAgent:
    """Wraps a Claude API call with web search for a specific research task."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=API_KEY)
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def call(self, system_prompt: str, user_prompt: str,
                   role: str, stage_id: str, max_tokens: int = 8000) -> AgentResult:
        """Make a Claude API call with web search tool."""
        async with self.semaphore:
            # Run sync client in thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: self._sync_call(
                system_prompt, user_prompt, max_tokens
            ))

        # Extract text and image URLs from response
        text_parts = []
        image_urls = []
        search_queries = []

        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "web_search_tool_result":
                for sub in block.content:
                    if hasattr(sub, "url"):
                        search_queries.append(getattr(sub, "url", ""))

        content = "\n".join(text_parts)

        # Extract image URLs from markdown content
        img_pattern = r'!\[.*?\]\((https?://[^\)]+)\)'
        found_urls = re.findall(img_pattern, content)
        image_urls.extend(found_urls)

        # Also extract bare image URLs mentioned
        bare_img = re.findall(r'(https?://[^\s\)]+\.(?:jpg|jpeg|png|webp))', content, re.I)
        image_urls.extend(bare_img)

        image_urls = list(dict.fromkeys(image_urls))  # dedupe keeping order

        return AgentResult(
            role=role,
            stage_id=stage_id,
            content=content,
            search_queries=search_queries,
            image_urls=image_urls,
        )

    def _sync_call(self, system_prompt, user_prompt, max_tokens):
        return self.client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            tools=[{
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": MAX_WEB_SEARCH_USES,
            }],
            messages=[{"role": "user", "content": user_prompt}],
        )


# ── Prompt templates ─────────────────────────────────────────────────────────

SYSTEM_BASE = """Sei un autore esperto di guide di viaggio. Scrivi in italiano, con uno stile
vivace, pratico e personale — come se stessi consigliando un amico. Il tuo obiettivo è creare
una guida che renda inutile comprare Lonely Planet.

Regole:
- Scrivi SEMPRE in italiano
- Usa Markdown con intestazioni ##, ###, elenchi puntati, tabelle dove utile
- Includi link web reali e attuali (siti ufficiali, Google Maps, blog affidabili)
- Per le immagini: cerca su Wikimedia Commons, Unsplash o Pexels immagini pertinenti
  e inseriscile come ![descrizione](url) — solo immagini con licenza libera
- Indica prezzi aggiornati al 2025-2026 dove possibile
- Il viaggio è per 4 viaggiatori (2 coppie), settembre-ottobre 2026
- Sii specifico: nomi di ristoranti, indirizzi, orari, trucchi da insider
- Non inventare informazioni — usa la ricerca web per verificare"""


def destination_overview_prompt(stage, trip_info):
    days_text = "\n".join([
        f"  Giorno {d['day_number']} ({d['date']}): {d['what_to_see']}"
        for d in stage["stage_days"]
    ])
    alternatives = "\n".join([
        f"  - {d['alternative_extra']}"
        for d in stage["stage_days"] if d.get("alternative_extra")
    ])

    return f"""Scrivi la sezione PANORAMICA della guida per: **{stage['name']}** ({stage['country']})

Date del viaggio: {stage['stage_days'][0]['date']} - {stage['stage_days'][-1]['date']} 2026
Numero notti: {len(stage['days'])}

Programma dal nostro itinerario:
{days_text}

Consigli extra dal nostro itinerario:
{alternatives}

Scrivi queste sezioni:
## {stage['name']} — Panoramica
- Breve intro emozionale sul luogo (2-3 frasi evocative)
- Perché vale la pena visitarlo (storia, unicità, cosa lo rende speciale)

### Storia e Cultura
- Cenni storici essenziali (non da Wikipedia — racconta la storia in modo coinvolgente)
- Curiosità culturali che un viaggiatore deve sapere

### Quando Andare
- Meteo specifico per fine settembre/inizio ottobre
- Cosa aspettarsi (piogge, caldo, umidità)

### Orientamento
- Come è strutturata la città/zona
- Quartieri principali e cosa c'è in ognuno
- Mappa mentale per orientarsi

Cerca sul web informazioni aggiornate. Inserisci 2-3 immagini da Wikimedia Commons."""


def day_by_day_prompt(stage, trip_info):
    days_detail = ""
    for d in stage["stage_days"]:
        days_detail += f"""
### Giorno {d['day_number']} — {d['date']} Set/Ott 2026
- Località: {d['location']}
- Cosa vedere: {d['what_to_see']}
- Alternativa: {d['alternative_extra']}
- Trasporto: {d['transport']}
- Alloggio: {d['accommodation_cost']}/notte
"""

    return f"""Scrivi la sezione GIORNO PER GIORNO della guida per: **{stage['name']}** ({stage['country']})

Ecco il programma base:
{days_detail}

Per OGNI giorno scrivi:
## Giorno N — Data — Titolo evocativo

### Mattina
- Cosa fare, in che ordine, consigli pratici
- Orari di apertura, prezzi di ingresso aggiornati
- Link al sito ufficiale dell'attrazione

### Pomeriggio
- Attività pomeridiane
- Alternative in caso di pioggia

### Sera
- Dove cenare (nomi specifici di ristoranti/bancarelle)
- Cosa fare la sera

### Tips del Giorno
- Trucchi pratici, cose da evitare, consigli insider

Cerca sul web orari, prezzi e consigli aggiornati. Inserisci 1-2 immagini per giorno."""


def food_culture_prompt(stage, trip_info):
    return f"""Scrivi la sezione CIBO E CULTURA della guida per: **{stage['name']}** ({stage['country']})

Il viaggio è per 4 persone (2 coppie italiane) a fine settembre/inizio ottobre 2026.

Scrivi queste sezioni:

## Dove e Cosa Mangiare a {stage['name']}

### Piatti Tipici Imperdibili
- I piatti locali da non perdere assolutamente
- Come si chiamano, cosa contengono, quanto costano
- Dove trovarli nella versione migliore

### I Nostri Ristoranti e Street Food Consigliati
- 5-8 posti specifici con nome, indirizzo/zona, fascia di prezzo
- Mix tra street food, ristoranti locali, e qualche posto più carino per la sera
- Cerca recensioni recenti su TripAdvisor/Google Maps per confermare che siano ancora aperti

### Mercati
- Mercati locali da visitare (per comprare e per l'esperienza)
- Orari migliori, cosa comprare

### Etichetta e Cultura
- Regole culturali importanti per i visitatori
- Come comportarsi nei templi, a tavola, con la gente
- Errori comuni da evitare

### Parole Utili
- 10-15 parole/frasi nella lingua locale con pronuncia

Cerca informazioni aggiornate sui ristoranti. Inserisci 1-2 foto di piatti tipici da Wikimedia."""


def practical_info_prompt(stage, trip_info):
    transport_info = "\n".join([
        f"  - Giorno {d['day_number']}: {d['transport']}"
        for d in stage["stage_days"]
    ])
    accommodation = stage["stage_days"][0].get("accommodation_cost", "N/D")

    return f"""Scrivi la sezione INFO PRATICHE della guida per: **{stage['name']}** ({stage['country']})

Trasporti dal nostro itinerario:
{transport_info}

Budget alloggio: {accommodation}/notte (per camera doppia, siamo in 4 = 2 camere)

Scrivi queste sezioni:

## Info Pratiche — {stage['name']}

### Come Arrivare
- Dettagli sul trasporto dal punto precedente dell'itinerario
- Compagnie di bus/treni, dove prenotare, link utili
- Durata reale, costi aggiornati, consigli

### Come Muoversi
- Trasporto locale: Grab, tuk-tuk, bici, a piedi
- Costi tipici, tratte comuni, app da usare

### Dove Dormire
- 3-4 raccomandazioni specifiche di alloggio per 4 persone (2 camere)
- Budget: {accommodation}/notte per camera
- Con link a Booking.com o sito dell'hotel
- Mix: guest house, hotel, ostello con camera privata

### Connettività e SIM
- Situazione WiFi e rete mobile nella zona
- Dove comprare/ricaricare SIM locale

### Sicurezza
- Avvertenze specifiche per la zona
- Truffe comuni da evitare
- Numeri di emergenza

Cerca informazioni aggiornate su trasporti e alloggi. Prezzi in €."""


# ── Planning section prompts ─────────────────────────────────────────────────

def budget_prompt(budget_data, trip_info):
    budget_text = json.dumps(budget_data, ensure_ascii=False, indent=2)
    return f"""Scrivi la sezione BUDGET della guida di viaggio.

Dati budget dal nostro foglio di calcolo:
{budget_text}

Siamo in 4 viaggiatori (2 coppie). I prezzi nel foglio sono per persona.

Scrivi:
## Budget — Quanto Costa Questo Viaggio

### Riepilogo Costi per Persona
- Tabella chiara con categorie e range min/stima/max

### Riepilogo Costi Totali (4 persone)
- Calcola i totali per il gruppo di 4
- Distingui costi individuali vs condivisibili (es. camera doppia, taxi diviso in 4)

### Come Risparmiare
- Consigli specifici per risparmiare su ogni categoria
- Dove è meglio NON risparmiare (assicurazione, ingressi importanti)

### Metodi di Pagamento
- Quando usare contanti vs carta
- ATM migliori per paese
- Come evitare commissioni

Cerca prezzi aggiornati 2025-2026 dove possibile."""


def documents_prompt(notes_data):
    doc_notes = [n for n in notes_data if n["topic"] in ("DOCUMENTI", "ASSICURAZIONE")]
    notes_text = json.dumps(doc_notes, ensure_ascii=False, indent=2)
    return f"""Scrivi la sezione DOCUMENTI E VISTI della guida.

Note dal nostro foglio:
{notes_text}

Scrivi:
## Documenti, Visti e Assicurazione

### Passaporto
- Requisiti di validità
- Checklist pre-partenza

### Vietnam — E-Visa
- Procedura passo-passo con link al sito ufficiale
- Costi, tempi, documenti necessari
- Errori comuni da evitare

### Cambogia — Visa on Arrival
- Procedura all'arrivo (noi arriviamo in barca da Chau Doc)
- Cosa portare (foto, USD)
- Alternativa e-Visa

### Thailandia
- Esenzione visto per italiani (30 giorni)
- Documenti richiesti all'ingresso

### Assicurazione di Viaggio
- Perché è essenziale (con esempi di costi sanitari in SE Asia)
- Compagnie raccomandate con link
- Cosa deve coprire

Cerca informazioni aggiornate sui requisiti 2026 per cittadini italiani."""


def health_prompt(notes_data):
    health_notes = [n for n in notes_data if n["topic"] == "SALUTE"]
    notes_text = json.dumps(health_notes, ensure_ascii=False, indent=2)
    return f"""Scrivi la sezione SALUTE E SICUREZZA della guida.

Note dal nostro foglio:
{notes_text}

Scrivi:
## Salute e Sicurezza

### Vaccinazioni
- Quali vaccini fare e quanto prima della partenza
- Dove farli in Italia (centri medicina del viaggiatore)
- Costi indicativi

### Farmacia da Viaggio
- Lista completa dei farmaci da portare
- Cosa si trova facilmente in loco e cosa no

### Acqua e Cibo
- Regole per evitare problemi gastrointestinali
- Borraccia filtrante: modelli consigliati

### Zanzare e Malaria
- Rischio reale nelle zone del nostro itinerario
- Profilassi sì/no — cosa dice il medico del viaggiatore
- Repellenti e precauzioni

### Emergenze
- Numeri utili per paese
- Ospedali consigliati nelle città principali
- Come funziona l'assicurazione in caso di emergenza

Cerca info sanitarie aggiornate per il Sud-Est Asiatico."""


def apps_connectivity_prompt(notes_data):
    app_notes = [n for n in notes_data if n["topic"] in ("APP UTILI", "DENARO")]
    notes_text = json.dumps(app_notes, ensure_ascii=False, indent=2)
    return f"""Scrivi la sezione APP E CONNETTIVITÀ della guida.

Note dal nostro foglio:
{notes_text}

Scrivi:
## App Essenziali e Connettività

### App da Installare Prima di Partire
- Lista di ogni app con: nome, a cosa serve, link download, configurazione
- Grab, PassApp, Google Maps offline, XE Currency, ecc.
- App per traduzione, per prenotare bus/treni

### SIM e Internet
- Quale SIM comprare in Vietnam (operatore, GB, costo)
- Situazione in Cambogia e Thailandia
- eSIM come alternativa — operatori consigliati
- WiFi: dove trovarlo, affidabilità

### Mappe Offline
- Come scaricare le mappe per ogni paese
- Quanto spazio servono
- Alternative a Google Maps per zone rurali

Cerca le app più aggiornate e utili per il SE Asia nel 2025-2026."""


def weather_packing_prompt(notes_data):
    weather_notes = [n for n in notes_data if n["topic"] == "METEO"]
    notes_text = json.dumps(weather_notes, ensure_ascii=False, indent=2)
    return f"""Scrivi la sezione METEO E BAGAGLIO della guida.

Note dal nostro foglio:
{notes_text}

Periodo: 20 settembre — 17 ottobre 2026 (fine stagione monsoni)

Scrivi:
## Meteo e Cosa Mettere in Valigia

### Clima Atteso
- Meteo dettagliato per ogni zona/paese nel nostro periodo
- Temperature, piogge, umidità — cosa aspettarsi realmente
- Grafici mentali: mattina vs pomeriggio vs sera

### Lista Bagaglio Completa
- Abbigliamento (quantità esatte per 28 giorni con lavanderia)
- Scarpe (trekking + sandali + città)
- Accessori (sarong per templi, cappello, occhiali)
- Elettronica (adattatori prese per paese, powerbank)
- Documenti e copie
- Farmacia (rimando alla sezione salute)

### Consigli Bagaglio
- Zaino vs valigia — cosa funziona meglio per questo itinerario
- Peso ideale per bus notturni e barche
- Cosa comprare là invece di portare

Cerca info meteo storiche per settembre-ottobre nel SE Asia."""


def general_tips_prompt(notes_data):
    tip_notes = [n for n in notes_data if n["topic"] == "CONSIGLI"]
    notes_text = json.dumps(tip_notes, ensure_ascii=False, indent=2)
    return f"""Scrivi la sezione CONSIGLI GENERALI della guida.

Note dal nostro foglio:
{notes_text}

Scrivi:
## Consigli Generali — Le Regole d'Oro del Viaggio

### Prima di Partire
- Checklist delle cose da fare nelle settimane prima
- Prenotazioni da fare in anticipo vs cose da lasciare flessibili
- Come prepararsi psicologicamente al SE Asia (per chi non c'è mai stato)

### Sul Posto
- Come contrattare (quando sì, quando no)
- Come evitare le trappole turistiche
- Dress code per templi e luoghi sacri
- Fotografia: regole e buon senso

### Trasporti
- Bus notturni: come sopravvivere e dormire
- Grab vs taxi vs tuk-tuk: quando usare cosa
- Come prenotare voli interni al miglior prezzo

### Shopping
- Cosa comprare e dove (sarto Hoi An, artigianato, spezie)
- Come riconoscere la qualità
- Dogana: cosa si può portare in Italia

Cerca consigli aggiornati per viaggiatori nel SE Asia."""


# ── Image downloader ─────────────────────────────────────────────────────────

async def download_image(url: str, stage_id: str, index: int) -> Optional[str]:
    """Download an image and return the local relative path."""
    try:
        stage_img_dir = IMAGES_DIR / stage_id
        stage_img_dir.mkdir(parents=True, exist_ok=True)

        # Create a short filename from URL hash
        url_hash = hashlib.md5(url.encode()).hexdigest()[:10]
        ext_match = re.search(r'\.(jpg|jpeg|png|webp|gif)', url, re.I)
        ext = ext_match.group(1).lower() if ext_match else "jpg"
        filename = f"{stage_id}_{index:02d}_{url_hash}.{ext}"
        filepath = stage_img_dir / filename

        if filepath.exists():
            return f"assets/images/{stage_id}/{filename}"

        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            resp = await client.get(url, headers={
                "User-Agent": "TravelGuideBot/1.0 (educational project)"
            })
            if resp.status_code == 200 and len(resp.content) > 1000:
                filepath.write_bytes(resp.content)
                return f"assets/images/{stage_id}/{filename}"
    except Exception as e:
        print(f"  ⚠ Image download failed ({url[:60]}...): {e}")
    return None


async def download_all_images(results: list[AgentResult]) -> dict[str, list[str]]:
    """Download all images found by agents, return mapping of URL -> local path."""
    url_map = {}
    tasks = []
    seen = set()

    for result in results:
        for i, url in enumerate(result.image_urls):
            if url in seen:
                continue
            seen.add(url)
            tasks.append((url, result.stage_id, len(seen)))

    print(f"\n📷 Downloading {len(tasks)} images...")
    for url, stage_id, idx in tasks:
        local_path = await download_image(url, stage_id, idx)
        if local_path:
            url_map[url] = local_path
            print(f"  ✓ {local_path}")

    return url_map


# ── Assembler ────────────────────────────────────────────────────────────────

def replace_image_urls(content: str, url_map: dict[str, str]) -> str:
    """Replace remote image URLs with local paths where downloaded."""
    for url, local_path in url_map.items():
        content = content.replace(url, local_path)
    return content


def write_stage_files(stage_id: str, results: list[AgentResult], url_map: dict):
    """Assemble and write all .md files for a destination stage."""
    stage_dir = GUIDE_DIR / stage_id
    stage_dir.mkdir(parents=True, exist_ok=True)

    role_file_map = {
        "overview": "panoramica.md",
        "day_by_day": "giorno-per-giorno.md",
        "food_culture": "cibo-e-cultura.md",
        "practical": "info-pratiche.md",
    }

    for result in results:
        if result.role in role_file_map:
            filename = role_file_map[result.role]
            content = replace_image_urls(result.content, url_map)
            filepath = stage_dir / filename
            filepath.write_text(content, encoding="utf-8")
            print(f"  ✓ {filepath.relative_to(BASE_DIR)}")


def write_planning_files(results: list[AgentResult], url_map: dict):
    """Write planning section .md files."""
    planning_dir = GUIDE_DIR / "00-pianificazione"
    planning_dir.mkdir(parents=True, exist_ok=True)

    role_file_map = {
        "budget": "budget.md",
        "documents": "documenti-e-visti.md",
        "health": "salute-e-sicurezza.md",
        "apps": "app-e-connettivita.md",
        "weather": "meteo-e-bagaglio.md",
        "tips": "consigli-generali.md",
    }

    for result in results:
        if result.role in role_file_map:
            filename = role_file_map[result.role]
            content = replace_image_urls(result.content, url_map)
            filepath = planning_dir / filename
            filepath.write_text(content, encoding="utf-8")
            print(f"  ✓ {filepath.relative_to(BASE_DIR)}")


# ── Main orchestrator ────────────────────────────────────────────────────────

async def generate_stage(agent: TravelGuideAgent, stage: dict, trip_info: dict) -> list[AgentResult]:
    """Run all 4 agents for a single destination stage in parallel."""
    stage_id = stage["id"]
    stage_name = stage["name"]
    print(f"\n🌍 {stage_name} — avvio 4 agenti...")

    tasks = [
        agent.call(SYSTEM_BASE, destination_overview_prompt(stage, trip_info),
                   "overview", stage_id),
        agent.call(SYSTEM_BASE, day_by_day_prompt(stage, trip_info),
                   "day_by_day", stage_id),
        agent.call(SYSTEM_BASE, food_culture_prompt(stage, trip_info),
                   "food_culture", stage_id),
        agent.call(SYSTEM_BASE, practical_info_prompt(stage, trip_info),
                   "practical", stage_id),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Handle errors gracefully
    good_results = []
    for r in results:
        if isinstance(r, Exception):
            print(f"  ⚠ Agent error for {stage_name}: {r}")
        else:
            print(f"  ✓ {r.role} — {len(r.content)} chars, {len(r.image_urls)} images")
            good_results.append(r)

    return good_results


async def generate_planning(agent: TravelGuideAgent, data: dict) -> list[AgentResult]:
    """Run all planning section agents in parallel."""
    print(f"\n📋 Pianificazione — avvio 6 agenti...")

    notes = data["practical_notes"]
    budget = data["budget"]
    trip = data["trip"]

    tasks = [
        agent.call(SYSTEM_BASE, budget_prompt(budget, trip),
                   "budget", "00-pianificazione"),
        agent.call(SYSTEM_BASE, documents_prompt(notes),
                   "documents", "00-pianificazione"),
        agent.call(SYSTEM_BASE, health_prompt(notes),
                   "health", "00-pianificazione"),
        agent.call(SYSTEM_BASE, apps_connectivity_prompt(notes),
                   "apps", "00-pianificazione"),
        agent.call(SYSTEM_BASE, weather_packing_prompt(notes),
                   "weather", "00-pianificazione"),
        agent.call(SYSTEM_BASE, general_tips_prompt(notes),
                   "tips", "00-pianificazione"),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    good_results = []
    for r in results:
        if isinstance(r, Exception):
            print(f"  ⚠ Planning agent error: {r}")
        else:
            print(f"  ✓ {r.role} — {len(r.content)} chars")
            good_results.append(r)

    return good_results


def generate_readme(data: dict):
    """Generate the master README.md for the guide."""
    stages = data["stages"]
    trip = data["trip"]

    toc_lines = []
    for s in stages:
        days_range = f"Giorno {s['days'][0]}-{s['days'][-1]}" if len(s['days']) > 1 else f"Giorno {s['days'][0]}"
        toc_lines.append(f"| [{s['name']}]({s['id']}/panoramica.md) | {s['country']} | {days_range} | {len(s['days'])} |")

    toc = "\n".join(toc_lines)

    readme = f"""# 🌏 {trip['title']}
## Guida di Viaggio — {trip['dates']}

> *{trip['duration_days']} giorni, {trip['travelers']} viaggiatori, 3 paesi, un'avventura indimenticabile.*

---

## 📋 Pianificazione

| Sezione | Descrizione |
|---------|-------------|
| [Budget](00-pianificazione/budget.md) | Costi dettagliati e come risparmiare |
| [Documenti e Visti](00-pianificazione/documenti-e-visti.md) | Passaporto, visti, assicurazione |
| [Salute e Sicurezza](00-pianificazione/salute-e-sicurezza.md) | Vaccini, farmaci, emergenze |
| [App e Connettività](00-pianificazione/app-e-connettivita.md) | App essenziali, SIM, WiFi |
| [Meteo e Bagaglio](00-pianificazione/meteo-e-bagaglio.md) | Clima e lista bagaglio |
| [Consigli Generali](00-pianificazione/consigli-generali.md) | Tips, trucchi, regole d'oro |

---

## 🗺️ Itinerario

| Destinazione | Paese | Giorni | Notti |
|-------------|-------|--------|-------|
{toc}

---

## 📖 Come Usare Questa Guida

Ogni destinazione ha 4 file:

- **`panoramica.md`** — Perché visitarla, storia, cultura, orientamento
- **`giorno-per-giorno.md`** — Programma dettagliato con orari, prezzi, consigli
- **`cibo-e-cultura.md`** — Dove mangiare, piatti tipici, etichetta locale
- **`info-pratiche.md`** — Trasporti, alloggi, sicurezza, connettività

Le immagini sono in `assets/images/` organizzate per destinazione.

---

*Generata con Claude AI — ultimo aggiornamento: {time.strftime('%d %B %Y')}*
"""

    readme_path = GUIDE_DIR / "README.md"
    readme_path.write_text(readme, encoding="utf-8")
    print(f"\n✓ {readme_path.relative_to(BASE_DIR)}")


# ── CLI & main ───────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="Generate travel guide with AI agents")
    parser.add_argument("--stage", help="Generate only this stage (e.g. 01-hanoi)")
    parser.add_argument("--planning-only", action="store_true", help="Only generate planning section")
    parser.add_argument("--skip-images", action="store_true", help="Skip image download")
    parser.add_argument("--skip-planning", action="store_true", help="Skip planning section")
    args = parser.parse_args()

    data = load_data()
    agent = TravelGuideAgent()
    all_results = []

    print("=" * 60)
    print(f"🌏 GENERATORE GUIDA DI VIAGGIO")
    print(f"   {data['trip']['title']}")
    print(f"   {data['trip']['dates']}")
    print(f"   {data['trip']['travelers']} viaggiatori")
    print("=" * 60)

    # Planning section
    if not args.stage and not args.skip_planning:
        planning_results = await generate_planning(agent, data)
        all_results.extend(planning_results)
        write_planning_files(planning_results, {})

    if not args.planning_only:
        # Destination stages
        stages_to_process = data["stages"]
        if args.stage:
            stages_to_process = [s for s in stages_to_process if s["id"] == args.stage]
            if not stages_to_process:
                print(f"❌ Stage '{args.stage}' not found")
                sys.exit(1)

        # Process stages in batches of 2 (each stage = 4 API calls, so 8 concurrent)
        for i in range(0, len(stages_to_process), 2):
            batch = stages_to_process[i:i+2]
            batch_tasks = [generate_stage(agent, s, data["trip"]) for s in batch]
            batch_results = await asyncio.gather(*batch_tasks)

            for stage, results in zip(batch, batch_results):
                all_results.extend(results)

                if not args.skip_images and results:
                    url_map = await download_all_images(results)
                else:
                    url_map = {}

                print(f"\n📝 Scrittura file per {stage['name']}...")
                write_stage_files(stage["id"], results, url_map)

    # Generate README
    generate_readme(data)

    print("\n" + "=" * 60)
    print(f"✅ GUIDA COMPLETATA!")
    print(f"   📁 {GUIDE_DIR}")
    print(f"   📄 {sum(1 for _ in GUIDE_DIR.rglob('*.md'))} file Markdown")
    img_count = sum(1 for _ in IMAGES_DIR.rglob('*') if _.is_file())
    print(f"   📷 {img_count} immagini scaricate")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
