import { notFound } from "next/navigation";
import { getStageContent } from "@/lib/content";
import { DESTINATIONS } from "@/lib/coordinates";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { SectionTabs } from "@/components/content/SectionTabs";
import { CountryBadge } from "@/components/ui/CountryBadge";
import { Calendar } from "lucide-react";
import type { Metadata } from "next";
import { asLocale, isLocale, sectionLabel, destName, destDates, t } from "@/lib/i18n";

export async function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ stageId: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; stageId: string }>;
}): Promise<Metadata> {
  const { lang: rawLang, stageId } = await params;
  const lang = asLocale(rawLang);
  const dest = DESTINATIONS.find((d) => d.id === stageId);
  return {
    title: dest
      ? `${destName(lang, dest.id, dest.name)} — ${sectionLabel(lang, "")}`
      : t(lang, "destinationFallback"),
  };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ lang: string; stageId: string }>;
}) {
  const { lang: rawLang, stageId } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang = rawLang;
  const dest = DESTINATIONS.find((d) => d.id === stageId);
  if (!dest) notFound();

  const content = await getStageContent(lang, stageId, "panoramica");

  return (
    <div>
      <SectionTabs stageId={stageId} lang={lang} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <CountryBadge country={dest.country} lang={lang} />
            <span className="text-sm text-text-secondary flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {destDates(lang, dest.dates, dest.days)}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-text">{destName(lang, dest.id, dest.name)}</h1>
        </div>
        <MarkdownRenderer html={content.html} />
      </div>
    </div>
  );
}
