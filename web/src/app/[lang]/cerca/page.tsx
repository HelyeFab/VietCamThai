"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFromPathname, t, langHref } from "@/lib/i18n";

interface SearchDoc {
  id: number;
  title: string;
  slug: string;
  section: string;
  content: string;
  excerpt: string;
  lang: string;
}

export default function SearchPage() {
  const lang = localeFromPathname(usePathname());
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[]>([]);
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/search-docs.json")
      .then((r) => r.json())
      .then((data: SearchDoc[]) => {
        // Only search within the current language's documents.
        setDocs(data.filter((d) => d.lang === lang));
        setLoaded(true);
      });
  }, [lang]);

  const search = useCallback(
    (q: string) => {
      if (!q.trim() || !docs.length) {
        setResults([]);
        return;
      }
      const terms = q.toLowerCase().split(/\s+/);
      const scored = docs
        .map((doc) => {
          const text = `${doc.title} ${doc.content}`.toLowerCase();
          let score = 0;
          for (const term of terms) {
            if (doc.title.toLowerCase().includes(term)) score += 10;
            const matches = text.split(term).length - 1;
            score += matches;
          }
          return { doc, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((r) => r.doc);
      setResults(scored);
    },
    [docs]
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  function getSnippet(doc: SearchDoc, q: string): string {
    const lower = doc.content.toLowerCase();
    const term = q.toLowerCase().split(/\s+/)[0];
    const idx = lower.indexOf(term);
    if (idx === -1) return doc.excerpt;
    const start = Math.max(0, idx - 60);
    const end = Math.min(doc.content.length, idx + 100);
    return (start > 0 ? "..." : "") + doc.content.slice(start, end) + (end < doc.content.length ? "..." : "");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={langHref(lang, "/")}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {t(lang, "backHome")}
      </Link>

      <h1 className="text-3xl font-bold text-text mb-6">{t(lang, "searchTitle")}</h1>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loaded ? t(lang, "searchPlaceholder") : t(lang, "searchLoading")}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          autoFocus
        />
      </div>

      {query && results.length === 0 && (
        <p className="text-text-secondary text-center py-8">
          {t(lang, "noResultsFor")} &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="space-y-4">
        {results.map((doc) => (
          <Link
            key={doc.id}
            href={doc.slug}
            className="block p-4 rounded-xl bg-surface hover:shadow-md transition-all duration-200 border border-transparent hover:border-primary/20"
          >
            <div className="text-xs text-primary font-medium mb-1 capitalize">
              {doc.section}
            </div>
            <h3 className="font-semibold text-text mb-1">{doc.title}</h3>
            <p className="text-sm text-text-secondary line-clamp-2">
              {getSnippet(doc, query)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
