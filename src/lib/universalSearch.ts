// ── PlayNexa Universal Search ────────────────────────────────
// Searches EVERYTHING: Movies, Games, Shorts, Features, Pages
// Future content auto-included via data files

import movies from '@/data/movies.json'
import gamesData from '@/data/games.json'
import shorts from '@/data/shorts.json'

export type SearchResultType =
  | 'movie'
  | 'game'
  | 'short'
  | 'feature'
  | 'page'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  thumbnail?: string
  href: string
  icon?: string
}

// Static app features/pages — ADD new features here as app grows
const APP_FEATURES: SearchResult[] = [
  {
    id: 'f1',
    type: 'feature',
    title: 'Smart Download',
    subtitle: 'Download from YouTube, TikTok & more',
    href: '/download',
    icon: '⬇️'
  },
  {
    id: 'f2',
    type: 'feature',
    title: 'My Library',
    subtitle: 'Saved movies and playlists',
    href: '/library',
    icon: '📚'
  },
  {
    id: 'f3',
    type: 'feature',
    title: 'Platforms',
    subtitle: 'Netflix, Disney+, Prime & more',
    href: '/platforms',
    icon: '📱'
  },
  {
    id: 'f4',
    type: 'feature',
    title: 'Profile',
    subtitle: 'Your account and settings',
    href: '/profile',
    icon: '👤'
  },
  {
    id: 'f5',
    type: 'feature',
    title: 'Settings',
    subtitle: 'Theme, performance, security',
    href: '/settings',
    icon: '⚙️'
  },
  {
    id: 'f6',
    type: 'feature',
    title: 'Shorts',
    subtitle: 'Watch short videos',
    href: '/shorts',
    icon: '▶️'
  },
  {
    id: 'f7',
    type: 'feature',
    title: 'Game Hub',
    subtitle: 'Play HTML5 games instantly',
    href: '/games',
    icon: '🎮'
  },
  {
    id: 'f8',
    type: 'feature',
    title: 'Movies',
    subtitle: 'Watch free movies on PlayNexa',
    href: '/movies',
    icon: '🎬'
  }
]

export const universalSearch = (
  query: string
): SearchResult[] => {
  if (!query.trim()) return []
  const q = query.toLowerCase().trim()

  const results: SearchResult[] = []

  // Search movies (root-level array)
  ;(movies as any[]).forEach((m: any) => {
    if (
      m.title?.toLowerCase().includes(q) ||
      m.genre?.some((g: string) =>
        g.toLowerCase().includes(q)
      ) ||
      m.language?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q) ||
      m.channel?.toLowerCase().includes(q)
    ) {
      results.push({
        id: m.id,
        type: 'movie',
        title: m.title,
        subtitle: `${m.language} • ${m.duration} • Free`,
        thumbnail: m.thumbnail,
        href: `/movies/${m.id}`
      })
    }
  })

  // Search games (wrapped in { games: [...] })
  gamesData.games.forEach((g: any) => {
    if (
      g.title.toLowerCase().includes(q) ||
      g.category?.toLowerCase().includes(q) ||
      g.tags?.some((t: string) =>
        t.toLowerCase().includes(q)
      )
    ) {
      results.push({
        id: g.id,
        type: 'game',
        title: g.title,
        subtitle: `${g.category} • ⭐${g.rating}`,
        thumbnail: g.thumbnail,
        href: `/games/${g.id}`
      })
    }
  })

  // Search shorts (root-level array)
  ;(shorts as any[]).forEach((s: any) => {
    if (
      s.title?.toLowerCase().includes(q) ||
      s.channel?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    ) {
      results.push({
        id: s.id,
        type: 'short',
        title: s.title,
        subtitle: `Short • ${s.channel}`,
        thumbnail: s.thumbnail,
        href: `/shorts`
      })
    }
  })

  // Search features/pages
  APP_FEATURES.forEach(f => {
    if (
      f.title.toLowerCase().includes(q) ||
      f.subtitle.toLowerCase().includes(q)
    ) {
      results.push(f)
    }
  })

  // Sort: features first, then movies, games, shorts
  const order: SearchResultType[] = [
    'feature', 'movie', 'game', 'short', 'page'
  ]
  results.sort((a, b) =>
    order.indexOf(a.type) - order.indexOf(b.type)
  )

  return results.slice(0, 30) // max 30 results
}

// Type badge color
export const getTypeBadge = (
  type: SearchResultType
) => {
  switch (type) {
    case 'movie':   return { label: 'Movie',   color: '#7C5CFF' }
    case 'game':    return { label: 'Game',    color: '#22C55E' }
    case 'short':   return { label: 'Short',   color: '#FF6B6B' }
    case 'feature': return { label: 'Feature', color: '#00D4FF' }
    default:        return { label: 'Page',    color: '#94A3B8' }
  }
}
