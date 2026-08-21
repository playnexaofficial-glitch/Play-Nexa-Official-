'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, BookmarkPlus } from 'lucide-react';

interface HeroBannerProps {
  id: string;
  title: string;
  thumbnail: string;
  rating: string;
  genre: string[];
  language: string;
  videoId: string;
}

export default function HeroBanner({
  id,
  title,
  thumbnail,
  rating,
  genre,
  language,
}: HeroBannerProps) {
  return (
    <section className="relative mx-4 rounded-2xl overflow-hidden" aria-label="Featured movie">
      <div className="relative aspect-[16/9]">
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pn-bg via-pn-bg/40 to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h2 className="text-white font-bold text-lg leading-tight">{title}</h2>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-pn-cyan text-sm font-semibold">
            ★ {rating}
          </span>
          <span className="text-pn-muted text-xs">
            {genre.join(' • ')}
          </span>
          <span className="text-pn-border">•</span>
          <span className="text-pn-muted text-xs">{language}</span>
        </div>

        <div className="flex gap-2 mt-2">
          <Link
            href={`/movies/${id}`}
            className="flex items-center justify-center gap-1.5 bg-pn-purple text-white rounded-xl h-10 px-4 text-sm font-semibold min-w-[44px] min-h-[44px] transition-opacity duration-150 hover:opacity-90"
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </Link>
          <button
            className="flex items-center justify-center gap-1.5 border border-pn-purple text-pn-purple rounded-xl h-10 px-4 text-sm font-semibold min-w-[44px] min-h-[44px] transition-colors duration-150 hover:bg-pn-purple/10"
            aria-label={`Save ${title} to watchlist`}
          >
            <BookmarkPlus className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </section>
  );
}
