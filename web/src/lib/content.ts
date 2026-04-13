import fs from "fs";
import path from "path";
import { parseMarkdown, type ParsedMarkdown } from "./markdown";

const GUIDA_DIR = path.join(process.cwd(), "..", "guida");
const DATA_DIR = path.join(process.cwd(), "..", "data");

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
  stageId: string,
  section: string = "panoramica"
): Promise<ParsedMarkdown> {
  const filePath = path.join(GUIDA_DIR, stageId, `${section}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return parseMarkdown(raw);
}

export async function getPlanningContent(
  slug: string
): Promise<ParsedMarkdown> {
  const filePath = path.join(GUIDA_DIR, "00-pianificazione", `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return parseMarkdown(raw);
}

export function getAllStageIds(): string[] {
  return getTripData().stages.map((s) => s.id);
}

export function getStageById(id: string): StageData | undefined {
  return getTripData().stages.find((s) => s.id === id);
}

/** Get hero image for a stage — extract the first image URL from panoramica.md */
export function getStageHeroImage(stageId: string): string | null {
  const filePath = path.join(GUIDA_DIR, stageId, "panoramica.md");
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  // Find first image markdown reference
  const match = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match ? match[1] : null;
}
