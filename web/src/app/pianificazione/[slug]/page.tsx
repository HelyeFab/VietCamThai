import { notFound } from "next/navigation";
import { getPlanningContent } from "@/lib/content";
import { PLANNING_SECTIONS } from "@/lib/coordinates";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return PLANNING_SECTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const section = PLANNING_SECTIONS.find((s) => s.slug === slug);
  return { title: section?.title || "Pianificazione" };
}

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = PLANNING_SECTIONS.find((s) => s.slug === slug);
  if (!section) notFound();

  const content = await getPlanningContent(slug);

  // Find prev/next
  const idx = PLANNING_SECTIONS.findIndex((s) => s.slug === slug);
  const prev = idx > 0 ? PLANNING_SECTIONS[idx - 1] : null;
  const next = idx < PLANNING_SECTIONS.length - 1 ? PLANNING_SECTIONS[idx + 1] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Torna alla home
      </Link>

      <h1 className="text-3xl font-bold text-text mb-2">{section.title}</h1>
      <p className="text-text-secondary mb-8">Pianificazione del viaggio</p>

      <MarkdownRenderer html={content.html} />

      {/* Prev/Next navigation */}
      <div className="flex justify-between mt-12 pt-6 border-t border-border">
        {prev ? (
          <Link
            href={`/pianificazione/${prev.slug}/`}
            className="text-sm text-primary hover:underline"
          >
            &larr; {prev.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link
            href={`/pianificazione/${next.slug}/`}
            className="text-sm text-primary hover:underline"
          >
            {next.title} &rarr;
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
