/**
 * Fix broken Wikimedia Commons page URLs in markdown files.
 * Converts commons.wikimedia.org/wiki/File:X → upload.wikimedia.org direct URL
 * using the Wikimedia API to resolve actual thumbnail URLs.
 */
import fs from "fs";
import path from "path";

const GUIDA_DIR = path.join(__dirname, "..", "..", "guida");

// Pattern: commons.wikimedia.org/wiki/File:NAME or with Category/media prefix
const WIKI_PAGE_RE = /!\[([^\]]*)\]\(https:\/\/commons\.wikimedia\.org\/wiki\/(?:File:|Category:[^#]*#\/media\/File:)([^)\s]+)\)/g;

interface Resolution {
  original: string;
  filename: string;
  directUrl: string | null;
}

async function resolveWikiFile(filename: string): Promise<string | null> {
  // Clean up the filename
  const clean = decodeURIComponent(filename)
    .replace(/#.*$/, "")  // remove anchors
    .replace(/ /g, "_");

  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(clean)}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;

  try {
    const resp = await fetch(apiUrl, {
      headers: { "User-Agent": "TravelGuideBot/1.0 (educational project)" },
    });
    const data = await resp.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    for (const page of Object.values(pages) as any[]) {
      if (page.imageinfo?.[0]) {
        // Prefer thumbnail URL (1200px) over full size
        return page.imageinfo[0].thumburl || page.imageinfo[0].url;
      }
    }
  } catch (e) {
    console.error(`  API error for ${clean}:`, e);
  }
  return null;
}

async function processFile(filePath: string): Promise<number> {
  let content = fs.readFileSync(filePath, "utf-8");
  let fixes = 0;

  const matches = [...content.matchAll(WIKI_PAGE_RE)];
  if (matches.length === 0) return 0;

  for (const match of matches) {
    const [fullMatch, altText, rawFilename] = match;
    const directUrl = await resolveWikiFile(rawFilename);

    if (directUrl) {
      const replacement = `![${altText}](${directUrl})`;
      content = content.replace(fullMatch, replacement);
      fixes++;
      console.log(`  ✓ ${rawFilename.slice(0, 50)} → resolved`);
    } else {
      // Remove the broken image entirely rather than leave a placeholder
      content = content.replace(fullMatch, "");
      fixes++;
      console.log(`  ✗ ${rawFilename.slice(0, 50)} → removed (API returned nothing)`);
    }
  }

  if (fixes > 0) {
    // Clean up any double blank lines left by removals
    content = content.replace(/\n{3,}/g, "\n\n");
    fs.writeFileSync(filePath, content, "utf-8");
  }

  return fixes;
}

async function main() {
  console.log("🔧 Fixing broken Wikimedia Commons page URLs...\n");

  let totalFixes = 0;

  // Walk all .md files in guida/
  function walkDir(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(full));
      } else if (entry.name.endsWith(".md")) {
        files.push(full);
      }
    }
    return files;
  }

  const mdFiles = walkDir(GUIDA_DIR);

  for (const file of mdFiles) {
    const relPath = path.relative(GUIDA_DIR, file);
    const fixes = await processFile(file);
    if (fixes > 0) {
      console.log(`  📄 ${relPath}: ${fixes} fix(es)\n`);
      totalFixes += fixes;
    }
  }

  console.log(`\n✅ Fixed ${totalFixes} broken image references`);
}

main();
