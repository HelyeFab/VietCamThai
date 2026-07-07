// Central i18n module for the bilingual (IT/EN) VietCamThai guide.
// Content markdown lives in guida/<locale>/; this file holds every UI/data string.

export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";

export function isLocale(x: string | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}

/** Coerce an arbitrary route segment / string into a valid Locale. */
export function asLocale(x: string | undefined): Locale {
  return isLocale(x) ? x : DEFAULT_LOCALE;
}

// ---------------------------------------------------------------------------
// UI strings
// ---------------------------------------------------------------------------
const UI = {
  it: {
    brand: "VCT Guida",
    tagline:
      "31 giorni, 12 destinazioni, 3 paesi — la guida definitiva per un'avventura nel Sud-Est Asiatico.",
    heroTitle: "Vietnam · Cambogia · Thailandia",
    heroDates: "1 — 31 Ott 2026",
    travelers: "4 viaggiatori",
    countries3: "3 paesi",
    startJourney: "Inizia il Viaggio",
    map: "Mappa",
    search: "Cerca",
    menu: "Menu",
    beforeYouGo: "Prima di Partire",
    destinations: "Destinazioni",
    seeMap: "Vedi mappa",
    planning: "Pianificazione",
    planningSub: "Pianificazione del viaggio",
    backHome: "Torna alla home",
    searchTitle: "Cerca nella Guida",
    searchPlaceholder: "Cerca destinazioni, piatti, consigli...",
    searchLoading: "Caricamento...",
    noResultsFor: "Nessun risultato per",
    mapTitle: "Mappa del Viaggio",
    mapLoading: "Caricamento mappa...",
    day: "giorno",
    days: "giorni",
    dayAbbrev: "G",
    openGuide: "Apri guida",
    footer: "VCT Guida — Vietnam · Cambogia · Thailandia 2026",
    metaTitleDefault: "VCT Guida — Vietnam Cambogia Thailandia",
    metaTitleTemplate: "%s | VCT Guida",
    metaDescription:
      "Guida di viaggio per Vietnam, Cambogia e Thailandia — 31 giorni, 12 destinazioni, 3 paesi.",
    destinationFallback: "Destinazione",
    switchTo: "English",
  },
  en: {
    brand: "VCT Guide",
    tagline:
      "31 days, 12 destinations, 3 countries — the definitive guide to a Southeast Asia adventure.",
    heroTitle: "Vietnam · Cambodia · Thailand",
    heroDates: "Oct 1 — 31, 2026",
    travelers: "4 travellers",
    countries3: "3 countries",
    startJourney: "Start the Journey",
    map: "Map",
    search: "Search",
    menu: "Menu",
    beforeYouGo: "Before You Go",
    destinations: "Destinations",
    seeMap: "See map",
    planning: "Planning",
    planningSub: "Trip planning",
    backHome: "Back to home",
    searchTitle: "Search the Guide",
    searchPlaceholder: "Search destinations, dishes, tips...",
    searchLoading: "Loading...",
    noResultsFor: "No results for",
    mapTitle: "Trip Map",
    mapLoading: "Loading map...",
    day: "day",
    days: "days",
    dayAbbrev: "D",
    openGuide: "Open guide",
    footer: "VCT Guide — Vietnam · Cambodia · Thailand 2026",
    metaTitleDefault: "VCT Guide — Vietnam Cambodia Thailand",
    metaTitleTemplate: "%s | VCT Guide",
    metaDescription:
      "Travel guide to Vietnam, Cambodia and Thailand — 31 days, 12 destinations, 3 countries.",
    destinationFallback: "Destination",
    switchTo: "Italiano",
  },
} as const;

export type UIKey = keyof (typeof UI)["it"];

export function t(lang: Locale, key: UIKey): string {
  return UI[lang][key] ?? UI[DEFAULT_LOCALE][key];
}

// ---------------------------------------------------------------------------
// Country display labels (data key "Vietnam"|"Cambogia"|"Thailandia" -> label)
// ---------------------------------------------------------------------------
const COUNTRY_LABEL: Record<Locale, Record<string, string>> = {
  it: { Vietnam: "Vietnam", Cambogia: "Cambogia", Thailandia: "Thailandia" },
  en: { Vietnam: "Vietnam", Cambogia: "Cambodia", Thailandia: "Thailand" },
};

export function countryLabel(lang: Locale, country: string): string {
  return COUNTRY_LABEL[lang][country] ?? country;
}

// ---------------------------------------------------------------------------
// Section tab labels, keyed by slug ("" = panoramica / overview)
// ---------------------------------------------------------------------------
const SECTION_LABEL: Record<Locale, Record<string, string>> = {
  it: {
    "": "Panoramica",
    "giorno-per-giorno": "Giorno per Giorno",
    "cibo-e-cultura": "Cibo e Cultura",
    "info-pratiche": "Info Pratiche",
  },
  en: {
    "": "Overview",
    "giorno-per-giorno": "Day by Day",
    "cibo-e-cultura": "Food & Culture",
    "info-pratiche": "Practical Info",
  },
};

export function sectionLabel(lang: Locale, slug: string): string {
  return SECTION_LABEL[lang][slug] ?? slug;
}

// ---------------------------------------------------------------------------
// Planning-section titles, keyed by slug
// ---------------------------------------------------------------------------
const PLANNING_LABEL: Record<Locale, Record<string, string>> = {
  it: {
    budget: "Budget",
    "documenti-e-visti": "Documenti e Visti",
    "salute-e-sicurezza": "Salute e Sicurezza",
    "app-e-connettivita": "App e Connettività",
    "meteo-e-bagaglio": "Meteo e Bagaglio",
    "consigli-generali": "Consigli Generali",
  },
  en: {
    budget: "Budget",
    "documenti-e-visti": "Documents & Visas",
    "salute-e-sicurezza": "Health & Safety",
    "app-e-connettivita": "Apps & Connectivity",
    "meteo-e-bagaglio": "Weather & Packing",
    "consigli-generali": "General Tips",
  },
};

export function planningLabel(lang: Locale, slug: string): string {
  return PLANNING_LABEL[lang][slug] ?? slug;
}

// ---------------------------------------------------------------------------
// Destination name overrides (default = the name in coordinates.ts)
// ---------------------------------------------------------------------------
const NAME_OVERRIDE: Record<Locale, Record<string, string>> = {
  it: {},
  en: { "02-baia-lan-ha": "Lan Ha Bay" },
};

export function destName(lang: Locale, id: string, defaultName: string): string {
  return NAME_OVERRIDE[lang][id] ?? defaultName;
}

// ---------------------------------------------------------------------------
// Dates: Italian is authored on the Destination; English is derived from the
// day numbers (the whole trip is October 2026).
// ---------------------------------------------------------------------------
export function destDates(lang: Locale, itDates: string, days: number[]): string {
  if (lang === "it") return itDates;
  const first = days[0];
  const last = days[days.length - 1];
  return days.length > 1 ? `Oct ${first}–${last}` : `Oct ${first}`;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------
/** Build a locale-prefixed path, e.g. langHref("en", "/mappa/") -> "/en/mappa/". */
export function langHref(lang: Locale, path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${p === "/" ? "/" : p}`;
}

/** Read the locale from a pathname's first segment. */
export function localeFromPathname(pathname: string): Locale {
  return asLocale(pathname.split("/")[1]);
}

/** Swap (or insert) the locale segment in a pathname, preserving the rest. */
export function swapLocaleInPathname(pathname: string, lang: Locale): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) {
    parts[1] = lang;
  } else {
    parts.splice(1, 0, lang);
  }
  const joined = parts.join("/");
  return joined === "" ? `/${lang}/` : joined;
}
