"use client";

import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFromPathname, t, langHref } from "@/lib/i18n";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
});

export default function MapPage() {
  const lang = localeFromPathname(usePathname());

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-surface">
        <Link
          href={langHref(lang, "/")}
          className="p-1 rounded-lg hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text" />
        </Link>
        <h1 className="font-bold text-text">{t(lang, "mapTitle")}</h1>
      </div>
      <div className="flex-1">
        <LeafletMap fullHeight lang={lang} />
      </div>
    </div>
  );
}
