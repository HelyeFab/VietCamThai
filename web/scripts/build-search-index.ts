import fs from "fs";
import path from "path";

const cwd = process.cwd();
const GUIDA_DIR = fs.existsSync(path.join(cwd, "guida"))
  ? path.join(cwd, "guida")
  : path.join(cwd, "..", "guida");
const OUT_DIR = fs.existsSync(path.join(cwd, "public"))
  ? path.join(cwd, "public")
  : path.join(cwd, "web", "public");

// Content is split per locale under guida/<locale>/.
const LOCALES = ["it", "en"] as const;

interface SearchDoc {
  id: number;
  title: string;
  slug: string;
  section: string;
  content: string;
  excerpt: string;
  lang: string;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // links
    .replace(/[*_`~]/g, "") // emphasis
    .replace(/\|.*?\|/g, " ") // tables
    .replace(/^[-*+]\s/gm, "") // list markers
    .replace(/^\d+\.\s/gm, "") // ordered list markers
    .replace(/^>\s/gm, "") // blockquotes
    .replace(/---/g, "") // hr
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(md: string): string {
  const match = md.match(/^#{1,2}\s+(.+)$/m);
  return match ? match[1].trim() : "Senza titolo";
}

const docs: SearchDoc[] = [];
let id = 0;

for (const lang of LOCALES) {
  const langDir = path.join(GUIDA_DIR, lang);
  if (!fs.existsSync(langDir)) continue;

  // Planning sections
  const planDir = path.join(langDir, "00-pianificazione");
  if (fs.existsSync(planDir)) {
    for (const file of fs.readdirSync(planDir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(planDir, file), "utf-8");
      const slug = file.replace(".md", "");
      const content = stripMarkdown(raw);
      docs.push({
        id: id++,
        title: extractTitle(raw),
        slug: `/${lang}/pianificazione/${slug}/`,
        section: "Pianificazione",
        content,
        excerpt: content.slice(0, 150),
        lang,
      });
    }
  }

  // Destination sections
  const stages = fs
    .readdirSync(langDir)
    .filter((d) => /^\d{2}-/.test(d) && d !== "00-pianificazione")
    .sort();

  for (const stageId of stages) {
    const stageDir = path.join(langDir, stageId);
    if (!fs.statSync(stageDir).isDirectory()) continue;

    for (const file of fs.readdirSync(stageDir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(stageDir, file), "utf-8");
      const section = file.replace(".md", "");
      const sectionSlug = section === "panoramica" ? "" : section;
      const content = stripMarkdown(raw);
      docs.push({
        id: id++,
        title: extractTitle(raw),
        slug: `/${lang}/destinazione/${stageId}/${sectionSlug ? sectionSlug + "/" : ""}`,
        section: stageId.replace(/^\d+-/, "").replace(/-/g, " "),
        content,
        excerpt: content.slice(0, 150),
        lang,
      });
    }
  }
}

fs.writeFileSync(
  path.join(OUT_DIR, "search-docs.json"),
  JSON.stringify(docs, null, 0),
  "utf-8"
);

console.log(`✓ Built search index: ${docs.length} documents`);
