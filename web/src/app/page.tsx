import { MapPin, Calendar, Users, Globe, ChevronRight, Wallet, FileText, HeartPulse, Wifi, CloudSun, Lightbulb } from "lucide-react";
import Link from "next/link";
import { StageCard } from "@/components/home/StageCard";
import { DESTINATIONS, PLANNING_SECTIONS } from "@/lib/coordinates";
import { getStageContent, getStageHeroImage } from "@/lib/content";

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet, FileText, HeartPulse, Wifi, CloudSun, Lightbulb,
};

export default async function HomePage() {
  const stageData = await Promise.all(
    DESTINATIONS.map(async (d) => {
      const content = await getStageContent(d.id, "panoramica");
      const heroImage = getStageHeroImage(d.id);
      return { ...d, excerpt: content.excerpt, heroImage };
    })
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary-dark to-secondary overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center text-white">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Vietnam &middot; Cambogia &middot; Thailandia
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-white/80 max-w-xl mx-auto">
            31 giorni, 12 destinazioni, 3 paesi — la guida definitiva per
            un&apos;avventura nel Sud-Est Asiatico.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
              <Calendar className="w-4 h-4" /> 1 — 31 Ott 2026
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
              <Users className="w-4 h-4" /> 4 viaggiatori
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
              <Globe className="w-4 h-4" /> 3 paesi
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href={`/destinazione/${DESTINATIONS[0].id}/`}
              className="px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors"
            >
              Inizia il Viaggio
            </Link>
            <Link
              href="/mappa/"
              className="px-6 py-3 bg-white/15 backdrop-blur-sm text-white font-semibold rounded-lg hover:bg-white/25 transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4" /> Mappa
            </Link>
          </div>
        </div>
      </section>

      {/* Planning cards */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-text mb-6">Prima di Partire</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PLANNING_SECTIONS.map((s) => {
            const Icon = PLAN_ICONS[s.icon] || FileText;
            return (
              <Link
                key={s.slug}
                href={`/pianificazione/${s.slug}/`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-text">{s.title}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Destination grid */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text">Destinazioni</h2>
          <Link
            href="/mappa/"
            className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
          >
            Vedi mappa <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stageData.map((stage) => (
            <StageCard key={stage.id} {...stage} />
          ))}
        </div>
      </section>
    </div>
  );
}
