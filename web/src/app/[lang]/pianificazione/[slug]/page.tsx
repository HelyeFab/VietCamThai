import { notFound } from "next/navigation";
import { getPlanningContent } from "@/lib/content";
import { PLANNING_SECTIONS } from "@/lib/coordinates";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { asLocale, isLocale, planningLabel, langHref, t } from "@/lib/i18n";

export async function generateStaticParams() {
  return PLANNING_SECTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang = asLocale(rawLang);
  const section = PLANNING_SECTIONS.find((s) => s.slug === slug);
  return { title: section ? planningLabel(lang, section.slug) : t(lang, "planning") };
}

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: rawLang, slug } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang = rawLang;
  const section = PLANNING_SECTIONS.find((s) => s.slug === slug);
  if (!section) notFound();

  const content = await getPlanningContent(lang, slug);

  // Find prev/next
  const idx = PLANNING_SECTIONS.findIndex((s) => s.slug === slug);
  const prev = idx > 0 ? PLANNING_SECTIONS[idx - 1] : null;
  const next = idx < PLANNING_SECTIONS.length - 1 ? PLANNING_SECTIONS[idx + 1] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={langHref(lang, "/")}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {t(lang, "backHome")}
      </Link>

      <h1 className="text-3xl font-bold text-text mb-2">{planningLabel(lang, section.slug)}</h1>
      <p className="text-text-secondary mb-8">{t(lang, "planningSub")}</p>

      <MarkdownRenderer html={content.html} />

      {/* Prev/Next navigation */}
      <div className="flex justify-between mt-12 pt-6 border-t border-border">
        {prev ? (
          <Link
            href={langHref(lang, `/pianificazione/${prev.slug}/`)}
            className="text-sm text-primary hover:underline"
          >
            &larr; {planningLabel(lang, prev.slug)}
          </Link>
        ) : <span />}
        {next ? (
          <Link
            href={langHref(lang, `/pianificazione/${next.slug}/`)}
            className="text-sm text-primary hover:underline"
          >
            {planningLabel(lang, next.slug)} &rarr;
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
