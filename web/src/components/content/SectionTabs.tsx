"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, CalendarDays, UtensilsCrossed, Info } from "lucide-react";
import { SECTION_TABS } from "@/lib/coordinates";

const ICONS = [Compass, CalendarDays, UtensilsCrossed, Info];

export function SectionTabs({ stageId }: { stageId: string }) {
  const pathname = usePathname();

  return (
    <div className="sticky top-14 z-40 bg-surface/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-2xl mx-auto flex overflow-x-auto scrollbar-hide">
        {SECTION_TABS.map((tab, i) => {
          const href = `/destinazione/${stageId}/${tab.slug ? tab.slug + "/" : ""}`;
          const isActive = pathname === href || pathname === href.slice(0, -1);
          const Icon = ICONS[i];

          return (
            <Link
              key={tab.slug}
              href={href}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-primary hover:border-primary/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
