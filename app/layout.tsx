import { INSTANCE_CONFIG } from "@/lib/platform/instance-config";
import { BrandingProvider } from "@/lib/platform/use-club-branding";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${INSTANCE_CONFIG.structureName} — Plateforme Esport`,
  description: `Gestion des rosters, résultats, programmes et performances de la structure ${INSTANCE_CONFIG.structureName}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><BrandingProvider>{children}</BrandingProvider></body>
    </html>
  );
}
