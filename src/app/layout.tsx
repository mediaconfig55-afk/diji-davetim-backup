import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { eventTypeLabels } from "@/lib/config";
import { getEventConfig } from "@/lib/event-config.server";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Etkinlik bilgileri doğrudan sunucu tarafında okunur. Eskiden burada
// kendi canlı adresimize HTTP isteği atılıyordu; bu hem lokal geliştirmede
// production verisini çekiyor hem de her istekte gereksiz bir tur atıyordu.
export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getEventConfig();
  const label = eventTypeLabels[cfg.eventType];

  const title = `${cfg.bride} & ${cfg.groom} — ${label.title}`;
  const description = cfg.welcomeMessage;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Tema renkleri de admin panelinden düzenlenebiliyor; statik config.ts
  // yerine çözümlenmiş (DB > config.ts) değer kullanılır.
  const { theme } = await getEventConfig();
  return (
    <html
      lang="tr"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
      style={
        {
          "--color-primary": theme.primary,
          "--color-primary-dark": theme.primaryDark,
          "--color-background": theme.background,
          "--color-surface": theme.surface,
          "--color-text": theme.textLight,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
