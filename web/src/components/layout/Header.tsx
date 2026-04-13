"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, Map } from "lucide-react";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggle = () => {
    document.getElementById("mobile-nav")?.classList.toggle("translate-x-0");
    document.getElementById("mobile-nav")?.classList.toggle("-translate-x-full");
    document.getElementById("nav-overlay")?.classList.toggle("hidden");
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-surface/90 backdrop-blur-lg shadow-sm"
          : "bg-surface/70 backdrop-blur-md"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
        <button
          onClick={toggle}
          className="p-2 -ml-2 rounded-lg hover:bg-primary/10 transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 text-text" />
        </button>

        <Link href="/" className="font-bold text-lg tracking-tight text-primary">
          VCT Guida
        </Link>

        <div className="flex items-center gap-0.5">
          <DarkModeToggle />
          <Link
            href="/mappa/"
            className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
            aria-label="Mappa"
          >
            <Map className="w-5 h-5 text-text" />
          </Link>
          <Link
            href="/cerca/"
            className="p-2 -mr-2 rounded-lg hover:bg-primary/10 transition-colors"
            aria-label="Cerca"
          >
            <Search className="w-5 h-5 text-text" />
          </Link>
        </div>
      </div>
    </header>
  );
}
