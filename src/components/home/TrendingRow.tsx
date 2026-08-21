// ── Play Nexa Trending Row ────────────────────────────────────
// Zero API — uses local JSON data
// Instant load — no network for movie list

'use client'

import Image from 'next/image'
import Link from 'next/link'
import moviesData from '@/data/movies.json'
import type { Movie } from '@/lib/search'

interface TrendingRowProps {
  title: string
  items?: Movie[]
  type?: 'movie' | 'game'
}

export default function TrendingRow({ title, items, type = 'movie' }: TrendingRowProps) {
  const displayItems = items ?? (moviesData as Movie[]).slice(0, 8)

  return (
    <section>
      <h2 className="px-4 mb-3 text-base font-semibold text-white">{title}</h2>
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={type === 'movie' ? `/movies/${item.id}` : `/games/${item.id}`}
            className="flex-shrink-0 w-[140px] rounded-2xl overflow-hidden bg-pn-card active:scale-[0.97] transition-transform duration-150"
          >
            <div className="relative">
              <Image
                src={item.thumbnail}
                alt={item.title}
                width={140}
                height={79}
                loading="lazy"
                className="w-full h-[79px] object-cover"
                unoptimized
              />
              {item.free && (
                <span className="absolute top-1.5 left-1.5 rounded-md bg-pn-purple px-1.5 py-0.5 text-[10px] font-bold text-white">
                  FREE
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="text-sm font-medium text-white truncate">{item.title}</p>
              <p className="text-xs text-pn-muted truncate">
                {item.language} &bull; {item.duration}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
