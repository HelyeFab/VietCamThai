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
  { id: "11-bangkok", name: "Bangkok", lat: 13.7563, lng: 100.5018, country: "Thailandia", days: [1, 2, 3, 4], dates: "1–4 Ott" },
  { id: "10-siem-reap-angkor", name: "Siem Reap & Angkor", lat: 13.3671, lng: 103.8448, country: "Cambogia", days: [5, 6, 7], dates: "5–7 Ott" },
  { id: "12-koh-rong-samloem", name: "Koh Rong Samloem", lat: 10.6097, lng: 103.2683, country: "Cambogia", days: [8, 9, 10], dates: "8–10 Ott" },
  { id: "09-phnom-penh", name: "Phnom Penh", lat: 11.5564, lng: 104.9282, country: "Cambogia", days: [11, 12], dates: "11–12 Ott" },
  { id: "08-chau-doc-mekong", name: "Chau Doc & Mekong", lat: 10.707, lng: 105.119, country: "Vietnam", days: [13], dates: "13 Ott" },
  { id: "07-ho-chi-minh-city", name: "Ho Chi Minh City", lat: 10.8231, lng: 106.6297, country: "Vietnam", days: [14, 15, 16], dates: "14–16 Ott" },
  { id: "06-hoi-an", name: "Hoi An", lat: 15.8801, lng: 108.338, country: "Vietnam", days: [17, 18, 19], dates: "17–19 Ott" },
  { id: "05-hue", name: "Hué", lat: 16.4637, lng: 107.5909, country: "Vietnam", days: [20, 21, 22], dates: "20–22 Ott" },
  { id: "04-phong-nha", name: "Phong Nha", lat: 17.59, lng: 106.2834, country: "Vietnam", days: [23, 24], dates: "23–24 Ott" },
  { id: "03-ninh-binh", name: "Ninh Binh", lat: 20.2506, lng: 105.9745, country: "Vietnam", days: [25, 26], dates: "25–26 Ott" },
  { id: "02-baia-lan-ha", name: "Baia di Lan Ha", lat: 20.72, lng: 107.0, country: "Vietnam", days: [27], dates: "27 Ott" },
  { id: "01-hanoi", name: "Hanoi", lat: 21.0285, lng: 105.8542, country: "Vietnam", days: [28, 29, 30, 31], dates: "28–31 Ott" },
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
