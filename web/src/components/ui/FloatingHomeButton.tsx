"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { type Locale, t, langHref } from "@/lib/i18n";

export function FloatingHomeButton({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const home = `/${lang}`;
  if (pathname === home || pathname === `${home}/`) return null;

  return (
    <Link
      href={langHref(lang, "/")}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all duration-200"
      aria-label={t(lang, "backHome")}
    >
      <Home className="w-5 h-5" />
    </Link>
  );
}
