import { notFound } from "next/navigation";
import { getStageContent } from "@/lib/content";
import { DESTINATIONS, SECTION_TABS } from "@/lib/coordinates";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { SectionTabs } from "@/components/content/SectionTabs";
import { CountryBadge } from "@/components/ui/CountryBadge";
import { Calendar } from "lucide-react";
import type { Metadata } from "next";
import { asLocale, isLocale, sectionLabel, destName, destDates, t } from "@/lib/i18n";

const VALID_SECTIONS = SECTION_TABS.filter((tab) => tab.slug).map((tab) => tab.slug);

export async function generateStaticParams() {
  const params: { stageId: string; section: string }[] = [];
  for (const d of DESTINATIONS) {
    for (const section of VALID_SECTIONS) {
      params.push({ stageId: d.id, section });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; stageId: string; section: string }>;
}): Promise<Metadata> {
  const { lang: rawLang, stageId, section } = await params;
  const lang = asLocale(rawLang);
  const dest = DESTINATIONS.find((d) => d.id === stageId);
  const tab = SECTION_TABS.find((t2) => t2.slug === section);
  return {
    title:
      dest && tab
        ? `${destName(lang, dest.id, dest.name)} — ${sectionLabel(lang, tab.slug)}`
        : t(lang, "destinationFallback"),
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ lang: string; stageId: string; section: string }>;
}) {
  const { lang: rawLang, stageId, section } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang = rawLang;
  const dest = DESTINATIONS.find((d) => d.id === stageId);
  const tab = SECTION_TABS.find((t2) => t2.slug === section);
  if (!dest || !tab) notFound();

  const content = await getStageContent(lang, stageId, tab.file);

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
          <p className="text-text-secondary mt-1">{sectionLabel(lang, tab.slug)}</p>
        </div>
        <MarkdownRenderer html={content.html} />
      </div>
    </div>
  );
}
