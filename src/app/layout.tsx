import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import OfflineIndicator from "@/components/OfflineIndicator";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import FeedbackWidget from "@/components/feedback/FeedbackWidget";
import { MusicStoreProvider } from "@/lib/musicPlayerStore";


const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const getMetadataBase = () => {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url && url.startsWith('http')) {
    try {
      return new URL(url);
    } catch {
      // fallback
    }
  }
  return new URL('https://playnexa.vercel.app');
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: 'Play Nexa — Free Movies, Music & Games',
    template: '%s | Play Nexa',
  },
  description:
    'Play Nexa — Watch free Bangla & Hindi movies, ' +
    'listen to music, play games online. ' +
    'No subscription needed. Stream unlimited entertainment.',
  keywords: [
    'play nexa',
    'free movies online',
    'bangla movie',
    'bengali movie online free',
    'hindi movie free',
    'free music streaming',
    'bangla song',
    'natok online',
    'free entertainment app',
    'watch movie online free',
    'yt music alternative',
    'online games free',
    'play nexa app',
    'stream movies free',
    'bangla natok free',
  ],
  authors: [{ name: 'Play Nexa Team' }],
  creator: 'Play Nexa',
  publisher: 'Play Nexa',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL
      || 'https://playnexa.vercel.app',
    siteName: 'Play Nexa',
    title: 'Play Nexa — Free Movies, Music & Games',
    description:
      'Watch free Bangla & Hindi movies, ' +
      'listen to music, play games. ' +
      'Your ultimate free entertainment hub.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Play Nexa — Free Entertainment Hub',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Play Nexa — Free Movies, Music & Games',
    description: 'Watch free movies, listen to music, play games.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-512.png',
    apple: '/icons/icon-512.png',
    shortcut: '/icons/icon-512.png',
  },
  themeColor: '#CC0000',
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#CC0000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#CC0000" />
        <meta name="msapplication-TileColor" content="#CC0000" />
        <meta name="msapplication-TileImage" content="/icons/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Play Nexa",
              "url": process.env.NEXT_PUBLIC_APP_URL
                || "https://playnexa.vercel.app",
              "description":
                "Free movies, music and games. " +
                "Watch Bangla & Hindi movies, " +
                "listen to music for free.",
              "applicationCategory":
                "EntertainmentApplication",
              "operatingSystem": "Android, Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
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
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <MusicStoreProvider>
          <OfflineIndicator />
          <ServiceWorkerRegistrar />
          <main className="min-h-screen">
            {children}
          </main>
          <BottomNav />
          <FeedbackWidget />
        </MusicStoreProvider>
      </body>
      </html>
  );
}
