import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import { DESCRIPTION, DOMAINE, TITRE } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(DOMAINE),
  title: { default: TITRE, template: `%s · ${TITRE}` },
  description: DESCRIPTION,
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: DOMAINE,
    siteName: TITRE,
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
