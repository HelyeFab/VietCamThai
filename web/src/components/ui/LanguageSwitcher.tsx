"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale, swapLocaleInPathname } from "@/lib/i18n";

export function LanguageSwitcher({ lang }: { lang: Locale }) {
  const pathname = usePathname();

  return (
    <div
      className="flex items-center rounded-full bg-primary/10 p-0.5 text-xs font-semibold"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => {
        const active = l === lang;
        return (
          <Link
            key={l}
            href={swapLocaleInPathname(pathname, l)}
            hrefLang={l}
            aria-current={active ? "true" : undefined}
            className={`px-2 py-0.5 rounded-full uppercase transition-colors ${
              active
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-primary"
            }`}
          >
            {l}
          </Link>
        );
      })}
    </div>
  );
}
