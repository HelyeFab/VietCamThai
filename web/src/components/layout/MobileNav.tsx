"use client";

import Link from "next/link";
import { X, Wallet, FileText, HeartPulse, Wifi, CloudSun, Lightbulb, MapPin, Search, Map as MapIcon } from "lucide-react";
import { DESTINATIONS, PLANNING_SECTIONS } from "@/lib/coordinates";
import {
  type Locale,
  t,
  langHref,
  countryLabel,
  planningLabel,
  destName,
} from "@/lib/i18n";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet, FileText, HeartPulse, Wifi, CloudSun, Lightbulb,
};

export function MobileNav({ lang }: { lang: Locale }) {
  const close = () => {
    document.getElementById("mobile-nav")?.classList.add("-translate-x-full");
    document.getElementById("mobile-nav")?.classList.remove("translate-x-0");
    document.getElementById("nav-overlay")?.classList.add("hidden");
  };

  const countries = ["Vietnam", "Cambogia", "Thailandia"] as const;
  const countryColors: Record<string, string> = {
    Vietnam: "text-vietnam",
    Cambogia: "text-cambodia",
    Thailandia: "text-thailand",
  };

  return (
    <>
      <div
        id="nav-overlay"
        className="fixed inset-0 bg-black/30 z-50 hidden"
        onClick={close}
      />
      <nav
        id="mobile-nav"
        className="fixed top-0 left-0 h-full w-72 bg-surface z-50 shadow-xl -translate-x-full transition-transform duration-300 overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-bold text-primary text-lg">{t(lang, "brand")}</span>
          <button onClick={close} className="p-1 rounded-lg hover:bg-primary/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Quick links */}
          <div className="flex gap-2">
            <Link
              href={langHref(lang, "/cerca/")}
              onClick={close}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-bg text-sm hover:bg-primary/10 transition-colors"
            >
              <Search className="w-4 h-4" /> {t(lang, "search")}
            </Link>
            <Link
              href={langHref(lang, "/mappa/")}
              onClick={close}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-bg text-sm hover:bg-primary/10 transition-colors"
            >
              <MapIcon className="w-4 h-4" /> {t(lang, "map")}
            </Link>
          </div>

          {/* Planning */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              {t(lang, "planning")}
            </h3>
            <div className="space-y-0.5">
              {PLANNING_SECTIONS.map((s) => {
                const Icon = ICON_MAP[s.icon] || FileText;
                return (
                  <Link
                    key={s.slug}
                    href={langHref(lang, `/pianificazione/${s.slug}/`)}
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    {planningLabel(lang, s.slug)}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Destinations by country */}
          {countries.map((country) => (
            <div key={country}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${countryColors[country]}`}>
                {countryLabel(lang, country)}
              </h3>
              <div className="space-y-0.5">
                {DESTINATIONS.filter((d) => d.country === country).map((d) => (
                  <Link
                    key={d.id}
                    href={langHref(lang, `/destinazione/${d.id}/`)}
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-text-secondary" />
                    <span className="flex-1">{destName(lang, d.id, d.name)}</span>
                    <span className="text-xs text-text-secondary">{t(lang, "dayAbbrev")}{d.days[0]}–{d.days[d.days.length - 1]}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
