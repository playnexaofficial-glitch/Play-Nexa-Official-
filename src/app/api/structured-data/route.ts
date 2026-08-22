import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || 'https://playnexa.vercel.app'

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": baseUrl,
        "name": "Play Nexa",
        "url": baseUrl,
        "description":
          "Free movies, music and games streaming. " +
          "Watch Bangla movies, Hindi movies, " +
          "listen to music and play games online for free.",
        "applicationCategory":
          "EntertainmentApplication",
        "operatingSystem": "Android, Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": [
          "Free Bangla Movies",
          "Free Hindi Movies",
          "Free Music Streaming",
          "Online Games",
          "Video Downloader",
          "Music Player",
          "No Subscription Required"
        ]
      },
      {
        "@type": "Organization",
        "name": "Play Nexa",
        "url": baseUrl,
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "playnexaofficial@gmail.com",
          "contactType": "Customer Service"
        }
      }
    ]
  }

  return NextResponse.json(structuredData, {
    headers: {
      'Content-Type': 'application/ld+json',
      'Cache-Control': 'public, max-age=86400',
    }
  })
}
