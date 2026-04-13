import fs from "fs";
import path from "path";

const GUIDA_DIR = path.join(__dirname, "..", "..", "guida");
const OUT_DIR = path.join(__dirname, "..", "public");

interface SearchDoc {
  id: number;
  title: string;
  slug: string;
  section: string;
  content: string;
  excerpt: string;
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

// Planning sections
const planDir = path.join(GUIDA_DIR, "00-pianificazione");
if (fs.existsSync(planDir)) {
  for (const file of fs.readdirSync(planDir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(planDir, file), "utf-8");
    const slug = file.replace(".md", "");
    const content = stripMarkdown(raw);
    docs.push({
      id: id++,
      title: extractTitle(raw),
      slug: `/pianificazione/${slug}/`,
      section: "Pianificazione",
      content,
      excerpt: content.slice(0, 150),
    });
  }
}

// Destination sections
const stages = fs
  .readdirSync(GUIDA_DIR)
  .filter((d) => /^\d{2}-/.test(d) && d !== "00-pianificazione")
  .sort();

for (const stageId of stages) {
  const stageDir = path.join(GUIDA_DIR, stageId);
  if (!fs.statSync(stageDir).isDirectory()) continue;

  for (const file of fs.readdirSync(stageDir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(stageDir, file), "utf-8");
    const section = file.replace(".md", "");
    const sectionSlug = section === "panoramica" ? "" : section;
    const content = stripMarkdown(raw);
    docs.push({
      id: id++,
      title: extractTitle(raw),
      slug: `/destinazione/${stageId}/${sectionSlug ? sectionSlug + "/" : ""}`,
      section: stageId.replace(/^\d+-/, "").replace(/-/g, " "),
      content,
      excerpt: content.slice(0, 150),
    });
  }
}

fs.writeFileSync(
  path.join(OUT_DIR, "search-docs.json"),
  JSON.stringify(docs, null, 0),
  "utf-8"
);

console.log(`✓ Built search index: ${docs.length} documents`);
