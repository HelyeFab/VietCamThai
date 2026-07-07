import { MapPin, Calendar, Users, Globe, ChevronRight, Wallet, FileText, HeartPulse, Wifi, CloudSun, Lightbulb } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StageCard } from "@/components/home/StageCard";
import { DESTINATIONS, PLANNING_SECTIONS } from "@/lib/coordinates";
import { getStageContent, getStageHeroImage } from "@/lib/content";
import {
  isLocale,
  t,
  langHref,
  destName,
  destDates,
  planningLabel,
} from "@/lib/i18n";

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet, FileText, HeartPulse, Wifi, CloudSun, Lightbulb,
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const stageData = await Promise.all(
    DESTINATIONS.map(async (d) => {
      const content = await getStageContent(lang, d.id, "panoramica");
      const heroImage = getStageHeroImage(d.id, lang);
      return {
        ...d,
        name: destName(lang, d.id, d.name),
        dates: destDates(lang, d.dates, d.days),
        excerpt: content.excerpt,
        heroImage,
      };
    })
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary-dark to-secondary overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center text-white">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {t(lang, "heroTitle")}
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-white/80 max-w-xl mx-auto">
            {t(lang, "tagline")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
              <Calendar className="w-4 h-4" /> {t(lang, "heroDates")}
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
              <Users className="w-4 h-4" /> {t(lang, "travelers")}
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2">
              <Globe className="w-4 h-4" /> {t(lang, "countries3")}
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href={langHref(lang, `/destinazione/${DESTINATIONS[0].id}/`)}
              className="px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors"
            >
              {t(lang, "startJourney")}
            </Link>
            <Link
              href={langHref(lang, "/mappa/")}
              className="px-6 py-3 bg-white/15 backdrop-blur-sm text-white font-semibold rounded-lg hover:bg-white/25 transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4" /> {t(lang, "map")}
            </Link>
          </div>
        </div>
      </section>

      {/* Planning cards */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-text mb-6">{t(lang, "beforeYouGo")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PLANNING_SECTIONS.map((s) => {
            const Icon = PLAN_ICONS[s.icon] || FileText;
            return (
              <Link
                key={s.slug}
                href={langHref(lang, `/pianificazione/${s.slug}/`)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-text">{planningLabel(lang, s.slug)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Destination grid */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text">{t(lang, "destinations")}</h2>
          <Link
            href={langHref(lang, "/mappa/")}
            className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
          >
            {t(lang, "seeMap")} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stageData.map((stage) => (
            <StageCard key={stage.id} {...stage} lang={lang} />
          ))}
        </div>
      </section>
    </div>
  );
}
