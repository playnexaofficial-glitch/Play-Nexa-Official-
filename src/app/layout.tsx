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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL
    || 'https://playnexa.vercel.app'
  ),
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
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Play Nexa — Free Movies, Music & Games',
    description:
      'Watch free movies, listen to music, ' +
      'play games — all in one place.',
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
    icon: '/icon-192.png',
    apple: '/icon-192.png',
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
