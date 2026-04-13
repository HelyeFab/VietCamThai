export interface Destination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: "Vietnam" | "Cambogia" | "Thailandia";
  days: number[];
  dates: string;
}

export const DESTINATIONS: Destination[] = [
  { id: "01-hanoi", name: "Hanoi", lat: 21.0285, lng: 105.8542, country: "Vietnam", days: [1, 2, 3], dates: "20–22 Set" },
  { id: "02-baia-lan-ha", name: "Baia di Lan Ha", lat: 20.72, lng: 107.0, country: "Vietnam", days: [4], dates: "23 Set" },
  { id: "03-ninh-binh", name: "Ninh Binh", lat: 20.2506, lng: 105.9745, country: "Vietnam", days: [5, 6], dates: "24–25 Set" },
  { id: "04-phong-nha", name: "Phong Nha", lat: 17.59, lng: 106.2834, country: "Vietnam", days: [7, 8], dates: "26–27 Set" },
  { id: "05-hue", name: "Hué", lat: 16.4637, lng: 107.5909, country: "Vietnam", days: [9, 10, 11], dates: "28–30 Set" },
  { id: "06-hoi-an", name: "Hoi An", lat: 15.8801, lng: 108.338, country: "Vietnam", days: [12, 13, 14], dates: "1–3 Ott" },
  { id: "07-ho-chi-minh-city", name: "Ho Chi Minh City", lat: 10.8231, lng: 106.6297, country: "Vietnam", days: [15, 16, 17], dates: "4–6 Ott" },
  { id: "08-chau-doc-mekong", name: "Chau Doc & Mekong", lat: 10.707, lng: 105.119, country: "Vietnam", days: [18], dates: "7 Ott" },
  { id: "09-phnom-penh", name: "Phnom Penh", lat: 11.5564, lng: 104.9282, country: "Cambogia", days: [19, 20], dates: "8–9 Ott" },
  { id: "10-siem-reap-angkor", name: "Siem Reap & Angkor", lat: 13.3671, lng: 103.8448, country: "Cambogia", days: [21, 22, 23, 24], dates: "10–13 Ott" },
  { id: "11-bangkok", name: "Bangkok", lat: 13.7563, lng: 100.5018, country: "Thailandia", days: [25, 26, 27, 28], dates: "14–17 Ott" },
];

export const COUNTRY_COLORS: Record<string, string> = {
  Vietnam: "#DA291C",
  Cambogia: "#032EA1",
  Thailandia: "#311B92",
};

export const PLANNING_SECTIONS = [
  { slug: "budget", title: "Budget", icon: "Wallet" },
  { slug: "documenti-e-visti", title: "Documenti e Visti", icon: "FileText" },
  { slug: "salute-e-sicurezza", title: "Salute e Sicurezza", icon: "HeartPulse" },
  { slug: "app-e-connettivita", title: "App e Connettività", icon: "Wifi" },
  { slug: "meteo-e-bagaglio", title: "Meteo e Bagaglio", icon: "CloudSun" },
  { slug: "consigli-generali", title: "Consigli Generali", icon: "Lightbulb" },
];

export const SECTION_TABS = [
  { slug: "", label: "Panoramica", file: "panoramica" },
  { slug: "giorno-per-giorno", label: "Giorno per Giorno", file: "giorno-per-giorno" },
  { slug: "cibo-e-cultura", label: "Cibo e Cultura", file: "cibo-e-cultura" },
  { slug: "info-pratiche", label: "Info Pratiche", file: "info-pratiche" },
];
