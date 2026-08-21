'use client'
import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Share2,
  Bookmark } from 'lucide-react'

interface Props {
  movieId: string; youtubeId: string
  title: string; userId: string | null
  initialLiked: boolean; initialSaved: boolean
  initialReaction: string | null
}

export default function ActionBar({
  movieId, youtubeId, title, userId,
  initialLiked, initialSaved, initialReaction
}: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [saved, setSaved] = useState(initialSaved)
  const [reaction, setReaction] = useState<
    string|null>(initialReaction)
  const [isLoading, setIsLoading] = useState(false)

  const doAction = async (
    action: string,
    extra: any = {}
  ) => {
    if (!userId || isLoading) return
    setIsLoading(true)
    try {
      await fetch('/api/movies/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          userId,
          movieId,
          youtubeId,
          ...extra,
        }),
      })
    } catch {}
    setIsLoading(false)
  }

  const handleLike = async () => {
    const next = !liked
    setLiked(next)
    await doAction('like')
  }

  const handleSave = async () => {
    const next = !saved
    setSaved(next)
    await doAction('save')
  }

  const handleReact = async (r: string) => {
    const next = reaction === r ? null : r
    setReaction(next)
    await doAction('react', { reaction: r })
  }

  const handleShare = async () => {
    const url =
      `${window.location.origin}/movies/${movieId}`
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {}
  }

  return (
    <div className="flex items-center gap-2
      overflow-x-auto hide-scroll pb-1">

      {/* Like/Dislike pill */}
      <div className="flex items-center
        bg-[#1A1A2E] rounded-full overflow-hidden
        flex-shrink-0 border border-[#2D2D44]">
        <button
          onClick={() => handleReact('like')}
          disabled={!userId}
          className={`flex items-center gap-1.5
            px-4 h-10 border-r border-[#2D2D44]
            active:opacity-60 disabled:opacity-40
            transition-colors duration-150
            ${reaction === 'like'
              ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'}`}>
          <ThumbsUp size={16} strokeWidth={2}
            fill={reaction === 'like'
              ? 'currentColor' : 'none'}/>
        </button>
        <button
          onClick={() => handleReact('dislike')}
          disabled={!userId}
          className={`flex items-center gap-1.5
            px-4 h-10 active:opacity-60
            disabled:opacity-40
            transition-colors duration-150
            ${reaction === 'dislike'
              ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>
          <ThumbsDown size={16} strokeWidth={2}
            fill={reaction === 'dislike'
              ? 'currentColor' : 'none'}/>
        </button>
      </div>

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2
          px-4 h-10 bg-[#1A1A2E] border
          border-[#2D2D44] rounded-full
          text-[#9CA3AF] text-sm flex-shrink-0
          active:opacity-60 transition-opacity duration-150">
        <Share2 size={15} strokeWidth={2}/>
        <span>Share</span>
      </button>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!userId}
        className={`flex items-center gap-2
          px-4 h-10 rounded-full text-sm
          flex-shrink-0 active:opacity-60
          disabled:opacity-40 border
          transition-colors duration-150
          ${saved
            ? 'bg-[#7C3AED]/15 border-[#7C3AED]' +
              ' text-[#A78BFA]'
            : 'bg-[#1A1A2E] border-[#2D2D44]' +
              ' text-[#9CA3AF]'}`}>
        <Bookmark size={15} strokeWidth={2}
          fill={saved ? 'currentColor' : 'none'}/>
        <span>{saved ? 'Saved' : 'Save'}</span>
      </button>

      {/* Like (heart style) */}
      <button
        onClick={handleLike}
        disabled={!userId}
        className={`flex items-center gap-2
          px-4 h-10 rounded-full text-sm
          flex-shrink-0 active:opacity-60
          disabled:opacity-40 border
          transition-colors duration-150
          ${liked
            ? 'bg-[#7C3AED]/15 border-[#7C3AED]' +
              ' text-[#A78BFA]'
            : 'bg-[#1A1A2E] border-[#2D2D44]' +
              ' text-[#9CA3AF]'}`}>
        <ThumbsUp size={15} strokeWidth={2}
          fill={liked ? 'currentColor' : 'none'}/>
        <span>{liked ? 'Liked' : 'Like'}</span>
      </button>
    </div>
  )
}
