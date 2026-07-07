import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { FloatingHomeButton } from "@/components/ui/FloatingHomeButton";
import { ReadingProgress } from "@/components/ui/ReadingProgress";
import { PageTransition } from "@/components/ui/PageTransition";
import { LOCALES, asLocale, isLocale, t } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = asLocale((await params).lang);
  return {
    title: {
      default: t(lang, "metaTitleDefault"),
      template: t(lang, "metaTitleTemplate"),
    },
    description: t(lang, "metaDescription"),
    manifest: "/manifest.json",
  };
}

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang: rawLang } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang = rawLang;

  return (
    <html lang={lang} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var d = localStorage.getItem('vct-dark-mode');
                if (d !== 'false') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-bg text-text transition-colors duration-300">
        <Header lang={lang} />
        <MobileNav lang={lang} />
        <ReadingProgress />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <FloatingHomeButton lang={lang} />
        <footer className="border-t border-border py-6 text-center text-sm text-text-secondary">
          <p>{t(lang, "footer")}</p>
        </footer>
      </body>
    </html>
  );
}
