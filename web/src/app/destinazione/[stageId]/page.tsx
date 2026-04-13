import { notFound } from "next/navigation";
import { getStageContent, getStageById } from "@/lib/content";
import { DESTINATIONS } from "@/lib/coordinates";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { SectionTabs } from "@/components/content/SectionTabs";
import { CountryBadge } from "@/components/ui/CountryBadge";
import { Calendar, MapPin } from "lucide-react";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ stageId: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stageId: string }>;
}): Promise<Metadata> {
  const { stageId } = await params;
  const dest = DESTINATIONS.find((d) => d.id === stageId);
  return { title: dest ? `${dest.name} — Panoramica` : "Destinazione" };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const dest = DESTINATIONS.find((d) => d.id === stageId);
  if (!dest) notFound();

  const content = await getStageContent(stageId, "panoramica");

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
        </div>
        <MarkdownRenderer html={content.html} />
      </div>
    </div>
  );
}
