import { notFound } from "next/navigation";
import { getStageContent } from "@/lib/content";
import { DESTINATIONS, SECTION_TABS } from "@/lib/coordinates";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { SectionTabs } from "@/components/content/SectionTabs";
import { CountryBadge } from "@/components/ui/CountryBadge";
import { Calendar } from "lucide-react";
import type { Metadata } from "next";

const VALID_SECTIONS = SECTION_TABS.filter((t) => t.slug).map((t) => t.slug);

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
  params: Promise<{ stageId: string; section: string }>;
}): Promise<Metadata> {
  const { stageId, section } = await params;
  const dest = DESTINATIONS.find((d) => d.id === stageId);
  const tab = SECTION_TABS.find((t) => t.slug === section);
  return {
    title: dest && tab ? `${dest.name} — ${tab.label}` : "Destinazione",
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ stageId: string; section: string }>;
}) {
  const { stageId, section } = await params;
  const dest = DESTINATIONS.find((d) => d.id === stageId);
  const tab = SECTION_TABS.find((t) => t.slug === section);
  if (!dest || !tab) notFound();

  const content = await getStageContent(stageId, tab.file);

  return (
    <div>
      <SectionTabs stageId={stageId} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <CountryBadge country={dest.country} />
            <span className="text-sm text-text-secondary flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {dest.dates}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-text">{dest.name}</h1>
          <p className="text-text-secondary mt-1">{tab.label}</p>
        </div>
        <MarkdownRenderer html={content.html} />
      </div>
    </div>
  );
}
