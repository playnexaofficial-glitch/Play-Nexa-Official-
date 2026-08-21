import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import OfflineIndicator from "@/components/OfflineIndicator";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";


const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Play Nexa — Premium Media Ecosystem",
  description: "Download, watch, play and manage entertainment — all in one place. Premium futuristic media ecosystem.",
  keywords: ["Play Nexa", "Media", "Download", "Movies", "Games", "Music", "Streaming"],
  authors: [{ name: "Play Nexa" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Play Nexa",
  },
  openGraph: {
    title: "Play Nexa — Premium Media Ecosystem",
    description: "Download, watch, play and manage entertainment — all in one place.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var _k = 'pn_settings';
                if (!localStorage.getItem(_k)) {
                  var _old = localStorage.getItem('grovix_settings');
                  if (_old) { localStorage.setItem(_k, _old); localStorage.removeItem('grovix_settings'); }
                }
                var s = JSON.parse(localStorage.getItem(_k) || '{}');
                var theme = s.theme || 'dark';
                var themes = {
                  dark:   { bg: '#070B14', accent: '#7C5CFF' },
                  amoled: { bg: '#000000', accent: '#7C5CFF' },
                  neon:   { bg: '#070B14', accent: '#00FF88' }
                };
                var t = themes[theme] || themes.dark;
                document.documentElement.style
                  .setProperty('--accent', t.accent);
                document.body.style.backgroundColor = t.bg;
              } catch(e) {}
            `
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased bg-pn-bg text-white min-h-screen`}
      >
        <OfflineIndicator />
        <ServiceWorkerRegistrar />
        <main className="min-h-screen">
          {children}
        </main>
        <BottomNav />
        <FeedbackWidget />
      </body>
    </html>
  );
}
