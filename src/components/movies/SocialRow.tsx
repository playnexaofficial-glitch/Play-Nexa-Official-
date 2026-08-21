// ── Play Nexa Social Row ──────────────────────────────────────
// Like, Share, Save, Download — all real working
// Like = localStorage toggle (real)
// Share = navigator.share API (real)
// Save = uses existing SaveButton (IndexedDB)
// Download = uses existing DownloadButton (external redirect)

'use client'

import { useState, useEffect } from 'react'
import { Heart, Share2 } from 'lucide-react'
import SaveButton from '@/components/offline/SaveButton'
import DownloadButton from '@/components/offline/DownloadButton'
import type { Movie } from '@/lib/search'

interface Props {
  movie: Movie
}

export default function SocialRow({ movie }: Props) {
  const [liked, setLiked] = useState(false)

  // Real like state from localStorage
  useEffect(() => {
    try {
      const likes: string[] = JSON.parse(
        localStorage.getItem('pn_likes') || '[]',
      )
      setLiked(likes.includes(movie.id))
    } catch {
      setLiked(false)
    }
  }, [movie.id])

  const toggleLike = () => {
    try {
      const likes: string[] = JSON.parse(
        localStorage.getItem('pn_likes') || '[]',
      )
      const updated = liked
        ? likes.filter(id => id !== movie.id)
        : [...likes, movie.id]
      localStorage.setItem('pn_likes', JSON.stringify(updated))
      setLiked(!liked)
    } catch {
      // Silently fail
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: movie.title,
      text: `Watch ${movie.title} on Play Nexa`,
      url: `${window.location.origin}/movies/${movie.id}`,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
      }
    } catch {
      // User cancelled or clipboard failed
    }
  }

  return (
    <div className="px-4 mt-4">
      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {/* Like */}
        <button
          onClick={toggleLike}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5
                      rounded-xl text-sm font-medium
                      min-h-[44px] border
                      transition-all duration-200
                      active:scale-95
                      ${liked
                        ? 'bg-red-500/10 border-red-500 text-red-500'
                        : 'bg-pn-card border-pn-border text-white'
                      }`}
        >
          <Heart
            size={16}
            fill={liked ? 'currentColor' : 'none'}
          />
          {liked ? 'Liked' : 'Like'}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          type="button"
          className="flex items-center gap-2 px-4 py-2.5
                     rounded-xl text-sm font-medium
                     min-h-[44px] border border-pn-border
                     bg-pn-card text-white
                     active:scale-95
                     transition-all duration-200"
        >
          <Share2 size={16} />
          Share
        </button>

        {/* Save — real IndexedDB via existing SaveButton */}
        <SaveButton
          media={{
            id: movie.id,
            title: movie.title,
            thumbnail: movie.thumbnail,
            videoId: movie.videoId,
            duration: movie.duration,
            type: 'movie',
            language: movie.language,
            channel: movie.channel,
            genre: movie.genre,
          }}
        />

        {/* Download — real external redirect via existing DownloadButton */}
        <DownloadButton
          videoId={movie.videoId}
          type="video"
          title={movie.title}
        />
      </div>
    </div>
  )
}
