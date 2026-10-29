import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Header } from "@/components/Header";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: { default: "Rouge & Noir — Les Pronostics", template: "%s · Rouge & Noir" },
  description: "Pronostiquez chaque match du Stade Rennais, marquez des points et défiez vos amis.",
  applicationName: "Rouge & Noir",
  appleWebApp: { capable: true, title: "Rouge & Noir", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Thème choisi sur cet appareil (cookie) ; clair par défaut. Posé côté serveur : aucun clignotement.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="fr" data-theme={theme} className={`${inter.variable} ${barlow.variable}`}>
      <body className="min-h-screen bg-page font-sans text-neutral-900 antialiased">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">{children}</main>
      </body>
    </html>
  );
}
