'use client'

import Image from 'next/image'
import { Trash2, Play, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OfflineCardProps {
  media: {
    id: string
    title: string
    thumbnail: string
    videoId: string
    duration: string
    type: 'movie' | 'short'
    language: string
    channel: string
    quality: string
    estimatedSizeMB: number
    savedAt: number
    status: 'saving' | 'saved' | 'failed'
    watchProgress: number
    watchPercent: number
    lastWatchedAt: number | null
  }
  onDelete: (id: string) => void
}

export default function OfflineCard({ media, onDelete }: OfflineCardProps) {
  const router = useRouter()

  const savedDate = new Date(media.savedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="bg-pn-card border border-pn-border rounded-2xl overflow-hidden">
      {/* Thumbnail */}
      <div className="relative w-full aspect-video">
        <Image
          src={media.thumbnail}
          alt={media.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 33vw"
          loading="lazy"
          unoptimized
        />

        {/* OFFLINE badge */}
        <span className="absolute top-2 left-2 bg-pn-success text-white text-[9px] font-bold rounded-full px-2 py-0.5">
          OFFLINE
        </span>

        {/* Duration */}
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[9px] rounded px-1.5 py-0.5">
          {media.duration}
        </span>

        {/* Watch progress bar */}
        {media.watchPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50">
            <div
              className="h-0.5 bg-pn-purple"
              style={{ width: `${media.watchPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-white text-xs font-semibold line-clamp-2 mb-2">
          {media.title}
        </p>

        <div className="flex items-center gap-1 text-pn-muted text-[10px] mb-3">
          <Clock size={9} />
          <span>Saved {savedDate}</span>
          <span className="mx-1">&bull;</span>
          <span>{media.estimatedSizeMB} MB</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/movies/${media.videoId}`)}
            type="button"
            className="flex-1 h-9 rounded-xl bg-pn-purple text-white text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-transform duration-150"
          >
            <Play size={12} />
            {media.watchPercent > 0 ? 'Continue' : 'Watch'}
          </button>
          <button
            onClick={() => onDelete(media.id)}
            type="button"
            className="h-9 w-9 rounded-xl bg-pn-border flex items-center justify-center active:scale-95 transition-transform duration-150"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
