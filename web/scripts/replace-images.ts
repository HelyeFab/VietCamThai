/**
 * Replace images in markdown files with relevant Wikimedia Commons images.
 * Uses the Wikimedia API to search by destination + attraction name.
 */
import fs from "fs";
import path from "path";

const GUIDA_DIR = path.join(__dirname, "..", "..", "guida");

// Curated search queries per destination + section
// Each entry: [search query, alt text in Italian]
const IMAGE_MAP: Record<string, Record<string, [string, string][]>> = {
  "01-hanoi": {
    "panoramica": [
      ["Hanoi Old Quarter street", "Quartiere Vecchio di Hanoi"],
      ["Hoan Kiem Lake Hanoi temple", "Lago Hoan Kiem e Tempio Ngoc Son"],
      ["Hanoi Opera House", "Opera House di Hanoi nel Quartiere Francese"],
    ],
    "giorno-per-giorno": [
      ["Hanoi Old Quarter night", "Il Quartiere Vecchio di Hanoi di sera"],
      ["Ho Chi Minh Mausoleum Hanoi", "Mausoleo di Ho Chi Minh"],
      ["Temple of Literature Hanoi", "Tempio della Letteratura"],
    ],
    "cibo-e-cultura": [
      ["Pho bo Vietnamese soup", "Pho bo — zuppa di noodles vietnamita"],
      ["Bun cha Hanoi", "Bun cha, il piatto iconico di Hanoi"],
    ],
  },
  "02-baia-lan-ha": {
    "panoramica": [
      ["Lan Ha Bay Vietnam", "La Baia di Lan Ha vista dall'alto"],
      ["Ha Long Bay limestone karsts", "Faraglioni calcarei nella baia"],
    ],
    "giorno-per-giorno": [
      ["Lan Ha Bay cruise boat", "Crociera nella Baia di Lan Ha"],
      ["Ha Long Bay kayak", "Kayak tra i faraglioni"],
    ],
    "cibo-e-cultura": [
      ["Vietnamese seafood market", "Pesce fresco al mercato vietnamita"],
    ],
  },
  "03-ninh-binh": {
    "panoramica": [
      ["Trang An Ninh Binh boat", "Trang An — escursione in barca"],
      ["Tam Coc rice fields Vietnam", "Le risaie di Tam Coc"],
    ],
    "giorno-per-giorno": [
      ["Trang An landscape Ninh Binh", "Paesaggio di Trang An"],
      ["Mua Cave Ninh Binh viewpoint", "Vista dalla Mua Cave al tramonto"],
    ],
    "cibo-e-cultura": [
      ["Vietnamese goat meat dish", "Capretto alla griglia, specialità di Ninh Binh"],
    ],
  },
  "04-phong-nha": {
    "panoramica": [
      ["Phong Nha cave entrance boat", "Ingresso della Grotta di Phong Nha in barca"],
      ["Phong Nha Ke Bang National Park", "Parco Nazionale di Phong Nha-Ke Bang"],
    ],
    "giorno-per-giorno": [
      ["Paradise Cave Phong Nha", "Paradise Cave — la grotta del Paradiso"],
      ["Phong Nha river valley", "La valle del fiume Son a Phong Nha"],
    ],
    "cibo-e-cultura": [
      ["Vietnamese street food stall", "Bancarella di street food vietnamita"],
    ],
  },
  "05-hue": {
    "panoramica": [
      ["Hue Imperial City gate", "La Cittadella Imperiale di Hué"],
      ["Perfume River Hue Vietnam", "Il Fiume dei Profumi a Hué"],
      ["Thien Mu Pagoda Hue", "La Pagoda Thien Mu"],
    ],
    "giorno-per-giorno": [
      ["Hue Imperial City inside", "Interno della Città Imperiale"],
      ["Tu Duc tomb Hue", "La Tomba dell'Imperatore Tu Duc"],
    ],
    "cibo-e-cultura": [
      ["Bun bo Hue soup", "Bun bo Hue — la zuppa piccante di Hué"],
    ],
  },
  "06-hoi-an": {
    "panoramica": [
      ["Hoi An ancient town lanterns", "Hoi An illuminata dalle lanterne"],
      ["Hoi An Japanese Bridge", "Il Ponte Giapponese di Hoi An"],
    ],
    "giorno-per-giorno": [
      ["Hai Van Pass Vietnam road", "Il Passo delle Nubi (Hai Van Pass)"],
      ["My Son sanctuary Vietnam", "Il Santuario di My Son"],
    ],
    "cibo-e-cultura": [
      ["Cao lau Hoi An noodles", "Cao Lau — noodles tipici di Hoi An"],
      ["Banh mi Hoi An", "Banh Mi di Hoi An"],
    ],
  },
  "07-ho-chi-minh-city": {
    "panoramica": [
      ["Ho Chi Minh City skyline Saigon", "Lo skyline di Ho Chi Minh City"],
      ["Saigon Notre Dame Cathedral", "La Cattedrale di Notre-Dame di Saigon"],
    ],
    "giorno-per-giorno": [
      ["Saigon Central Post Office inside", "L'Ufficio Postale Centrale di Saigon"],
      ["Cu Chi Tunnels Vietnam", "I Tunnel di Cu Chi"],
    ],
    "cibo-e-cultura": [
      ["Banh mi Vietnamese sandwich", "Banh Mi — il sandwich vietnamita"],
      ["Ben Thanh Market Saigon", "Il Mercato Ben Thanh"],
    ],
  },
  "08-chau-doc-mekong": {
    "panoramica": [
      ["Mekong Delta Vietnam floating market", "Il Delta del Mekong"],
      ["Chau Doc Sam Mountain", "Il Monte Sam a Chau Doc"],
    ],
    "giorno-per-giorno": [
      ["Tra Su forest Chau Doc", "La Foresta di Tra Su"],
      ["Mekong River boat Vietnam Cambodia", "Traversata del Mekong"],
    ],
    "cibo-e-cultura": [
      ["Vietnamese fish sauce making", "Produzione di salsa di pesce nel Delta"],
    ],
  },
  "09-phnom-penh": {
    "panoramica": [
      ["Phnom Penh Royal Palace Cambodia", "Il Palazzo Reale di Phnom Penh"],
      ["Phnom Penh riverside Mekong", "Il lungofiume del Mekong a Phnom Penh"],
    ],
    "giorno-per-giorno": [
      ["Tuol Sleng Genocide Museum", "Il Museo del Genocidio Tuol Sleng S-21"],
      ["Silver Pagoda Phnom Penh", "La Pagoda d'Argento"],
    ],
    "cibo-e-cultura": [
      ["Cambodian amok fish curry", "Fish Amok — il piatto nazionale cambogiano"],
    ],
  },
  "10-siem-reap-angkor": {
    "panoramica": [
      ["Angkor Wat sunrise Cambodia", "Alba ad Angkor Wat"],
      ["Bayon temple faces Angkor", "I volti del tempio Bayon"],
    ],
    "giorno-per-giorno": [
      ["Angkor Wat Cambodia temple", "Angkor Wat"],
      ["Ta Prohm temple trees Angkor", "Ta Prohm — il tempio di Tomb Raider"],
      ["Beng Mealea temple jungle", "Beng Mealea sommerso dalla giungla"],
    ],
    "cibo-e-cultura": [
      ["Cambodian street food Siem Reap", "Street food a Siem Reap"],
    ],
  },
  "11-bangkok": {
    "panoramica": [
      ["Grand Palace Bangkok Thailand", "Il Grand Palace di Bangkok"],
      ["Bangkok skyline Chao Phraya", "Lo skyline di Bangkok sul Chao Phraya"],
    ],
    "giorno-per-giorno": [
      ["Wat Arun Bangkok temple", "Wat Arun — il Tempio dell'Alba"],
      ["Maeklong Railway Market Thailand", "Il Mercato sui Binari di Maeklong"],
    ],
    "cibo-e-cultura": [
      ["Thai street food Bangkok Yaowarat", "Street food a Chinatown (Yaowarat)"],
      ["Pad Thai Bangkok", "Pad Thai — il piatto iconico thailandese"],
    ],
  },
};

async function searchWikimediaCommons(query: string): Promise<string | null> {
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;

  try {
    const resp = await fetch(apiUrl, {
      headers: { "User-Agent": "TravelGuideBot/1.0 (educational project)" },
    });
    const data = await resp.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    // Sort by page ID (lower = more established) and pick the best
    const sorted = Object.values(pages)
      .filter((p: any) => p.imageinfo?.[0]?.thumburl)
      .sort((a: any, b: any) => a.pageid - b.pageid);

    if (sorted.length > 0) {
      return (sorted[0] as any).imageinfo[0].thumburl;
    }
  } catch (e) {
    console.error(`  API error for "${query}":`, e);
  }
  return null;
}

async function processStage(stageId: string, sectionMap: Record<string, [string, string][]>) {
  console.log(`\n📍 ${stageId}`);

  for (const [section, queries] of Object.entries(sectionMap)) {
    const filePath = path.join(GUIDA_DIR, stageId, `${section}.md`);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, "utf-8");

    // Remove ALL existing image markdown lines (we'll replace them with curated ones)
    const lines = content.split("\n");
    const cleaned: string[] = [];
    let inGallery = false;

    for (const line of lines) {
      // Skip gallery sections added by image fetcher
      if (line.trim() === "### Galleria Fotografica") {
        inGallery = true;
        continue;
      }
      if (inGallery) {
        // Skip until we hit a non-gallery line (a heading that isn't part of gallery, or end of file)
        if (line.startsWith("## ") || line.startsWith("# ")) {
          inGallery = false;
          cleaned.push(line);
        }
        continue;
      }

      // Skip existing image lines
      if (/^\s*!\[.*\]\(.*\)\s*$/.test(line)) continue;
      // Skip attribution lines from gallery
      if (/^\*Foto di .* su (Unsplash|Pexels|Wikimedia)\*$/.test(line.trim())) continue;

      cleaned.push(line);
    }

    content = cleaned.join("\n").replace(/\n{3,}/g, "\n\n");

    // Now insert curated images after the first heading of each major section
    const resolvedImages: { query: string; url: string; alt: string }[] = [];

    for (const [query, alt] of queries) {
      const url = await searchWikimediaCommons(query);
      if (url) {
        resolvedImages.push({ query, url, alt });
        console.log(`  ✓ ${section}: "${query}" → found`);
      } else {
        console.log(`  ✗ ${section}: "${query}" → not found`);
      }
    }

    // Insert images after the first ## heading (or at the start after the first # heading)
    if (resolvedImages.length > 0) {
      const resultLines = content.split("\n");
      let insertIdx = -1;

      // Find first ## or # heading
      for (let i = 0; i < resultLines.length; i++) {
        if (/^#{1,2}\s/.test(resultLines[i])) {
          // Insert after the next blank line or the next paragraph
          insertIdx = i + 1;
          // Skip blank lines right after heading
          while (insertIdx < resultLines.length && resultLines[insertIdx].trim() === "") {
            insertIdx++;
          }
          // Skip the first paragraph
          while (insertIdx < resultLines.length && resultLines[insertIdx].trim() !== "") {
            insertIdx++;
          }
          break;
        }
      }

      if (insertIdx >= 0) {
        // Insert first image right after the intro paragraph
        const imgLine = `\n![${resolvedImages[0].alt}](${resolvedImages[0].url})\n`;
        resultLines.splice(insertIdx, 0, imgLine);

        // Distribute remaining images throughout the content at ## headings
        if (resolvedImages.length > 1) {
          let imgIdx = 1;
          for (let i = insertIdx + 1; i < resultLines.length && imgIdx < resolvedImages.length; i++) {
            if (/^#{2,3}\s/.test(resultLines[i])) {
              // Find end of next paragraph after this heading
              let paraEnd = i + 1;
              while (paraEnd < resultLines.length && resultLines[paraEnd].trim() === "") paraEnd++;
              while (paraEnd < resultLines.length && resultLines[paraEnd].trim() !== "" && !resultLines[paraEnd].startsWith("#")) paraEnd++;

              const img = resolvedImages[imgIdx];
              resultLines.splice(paraEnd, 0, `\n![${img.alt}](${img.url})\n`);
              imgIdx++;
              i = paraEnd + 2; // skip past what we just inserted
            }
          }
        }

        content = resultLines.join("\n");
      }
    }

    // Clean up
    content = content.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
    fs.writeFileSync(filePath, content, "utf-8");
  }
}

async function main() {
  console.log("🖼️  Replacing images with curated Wikimedia Commons photos...");

  for (const [stageId, sectionMap] of Object.entries(IMAGE_MAP)) {
    await processStage(stageId, sectionMap);
  }

  console.log("\n✅ Done! All images replaced with location-relevant photos.");
}

main();
