import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { FloatingHomeButton } from "@/components/ui/FloatingHomeButton";
import { ReadingProgress } from "@/components/ui/ReadingProgress";
import { PageTransition } from "@/components/ui/PageTransition";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "VCT Guida — Vietnam Cambogia Thailandia",
    template: "%s | VCT Guida",
  },
  description:
    "Guida di viaggio per Vietnam, Cambogia e Thailandia — 31 giorni, 12 destinazioni, 3 paesi.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
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
        <Header />
        <MobileNav />
        <ReadingProgress />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <FloatingHomeButton />
        <footer className="border-t border-border py-6 text-center text-sm text-text-secondary">
          <p>VCT Guida — Vietnam &middot; Cambogia &middot; Thailandia 2026</p>
        </footer>
      </body>
    </html>
  );
}
