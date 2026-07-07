import fs from "fs";
import path from "path";
import { parseMarkdown, type ParsedMarkdown } from "./markdown";
import { DEFAULT_LOCALE, type Locale } from "./i18n";

// Resolve guida/ and data/ — works both locally (cwd=web/) and on Vercel (cwd=project root)
function findDir(name: string): string {
  // Try as sibling of cwd (Vercel: cwd is project root)
  const asChild = path.join(process.cwd(), name);
  if (fs.existsSync(asChild)) return asChild;
  // Try as sibling of parent (local dev: cwd is web/)
  const asParentChild = path.join(process.cwd(), "..", name);
  if (fs.existsSync(asParentChild)) return asParentChild;
  throw new Error(`Cannot find ${name}/ directory from ${process.cwd()}`);
}

const GUIDA_DIR = findDir("guida");
const DATA_DIR = findDir("data");

export interface StageData {
  id: string;
  name: string;
  days: number[];
  country: string;
  stage_days: {
    day_number: number;
    date: string;
    location: string;
    country_zone: string;
    what_to_see: string;
    alternative_extra: string;
    transport: string;
    accommodation_cost: string;
    nights: string;
  }[];
}

export interface TripData {
  trip: {
    title: string;
    dates: string;
    duration_days: number;
    travelers: number;
  };
  stages: StageData[];
  all_days: StageData["stage_days"];
}

let cachedData: TripData | null = null;

export function getTripData(): TripData {
  if (cachedData) return cachedData;
  const raw = fs.readFileSync(path.join(DATA_DIR, "itinerary.json"), "utf-8");
  cachedData = JSON.parse(raw);
  return cachedData!;
}

export async function getStageContent(
  lang: Locale,
  stageId: string,
  section: string = "panoramica"
): Promise<ParsedMarkdown> {
  const filePath = path.join(GUIDA_DIR, lang, stageId, `${section}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return parseMarkdown(raw);
}

export async function getPlanningContent(
  lang: Locale,
  slug: string
): Promise<ParsedMarkdown> {
  const filePath = path.join(GUIDA_DIR, lang, "00-pianificazione", `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return parseMarkdown(raw);
}

export function getAllStageIds(): string[] {
  return getTripData().stages.map((s) => s.id);
}

export function getStageById(id: string): StageData | undefined {
  return getTripData().stages.find((s) => s.id === id);
}

/** Get hero image for a stage — extract the first image URL from panoramica.md.
 *  Image URLs are identical across locales, so this defaults to the default locale. */
export function getStageHeroImage(
  stageId: string,
  lang: Locale = DEFAULT_LOCALE
): string | null {
  const filePath = path.join(GUIDA_DIR, lang, stageId, "panoramica.md");
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  // Find first image markdown reference
  const match = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match ? match[1] : null;
}
