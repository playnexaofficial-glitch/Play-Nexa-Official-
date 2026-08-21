import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 })
    }

    const cleanUrl = url.trim()

    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({
        name: null,
        error: 'Could not fetch URL'
      })
    }

    const html = await res.text()

    const getMatch = (patterns: RegExp[]) => {
      for (const p of patterns) {
        const m = html.match(p)
        if (m?.[1]) {
          return m[1]
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim()
        }
      }
      return null
    }

    const name = getMatch([
      /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
      /<meta[^>]*name="title"[^>]*content="([^"]+)"/i,
      /<title[^>]*>(.*?)<\/title>/i,
    ])?.replace(' - Apps on Google Play', '')
      ?.replace(' | Google Play', '')
      ?.trim()

    const description = getMatch([
      /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i,
      /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
    ])

    const cover_url = getMatch([
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
      /<meta[^>]*itemprop="image"[^>]*content="([^"]+)"/i,
    ])

    // Auto-detect game type
    let game_type = 'online'
    if (cleanUrl.includes('play.google.com')) {
      game_type = 'download'
    } else if (cleanUrl.endsWith('.apk') || cleanUrl.includes('/apk/')) {
      game_type = 'offline'
    } else if (cleanUrl.includes('game') || cleanUrl.includes('play')) {
      game_type = 'online'
    }

    // Auto-detect category from keywords
    const lowerHtml = html.toLowerCase()
    let category = 'Action'
    if (lowerHtml.includes('puzzle')) category = 'Puzzle'
    else if (lowerHtml.includes('sport')) category = 'Sports'
    else if (lowerHtml.includes('race') || lowerHtml.includes('racing')) category = 'Racing'
    else if (lowerHtml.includes('rpg') || lowerHtml.includes('role')) category = 'RPG'
    else if (lowerHtml.includes('strategy')) category = 'Strategy'
    else if (lowerHtml.includes('arcade')) category = 'Arcade'
    else if (lowerHtml.includes('adventure')) category = 'Adventure'

    return NextResponse.json({
      name: name || null,
      description: description || '',
      cover_url: cover_url || null,
      game_type,
      category,
      url: cleanUrl,
    })
  } catch (err: any) {
    return NextResponse.json({
      name: null,
      error: err.message
    })
  }
}
