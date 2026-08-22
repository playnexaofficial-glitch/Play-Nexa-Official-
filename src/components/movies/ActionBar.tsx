'use client'
import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Share2, Bookmark } from 'lucide-react'

interface Props {
  movieId: string
  youtubeId: string
  title: string
  userId: string | null
  initialLiked: boolean
  initialSaved: boolean
  initialReaction: string | null
  channelId?: string
  channelName?: string
}

export default function ActionBar({
  movieId, youtubeId, title, userId,
  initialLiked, initialSaved, initialReaction,
  channelId, channelName,
}: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [saved, setSaved] = useState(initialSaved)
  const [reaction, setReaction] = useState<string | null>(initialReaction)
  const [subscribed, setSubscribed] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  const doAction = async (action: string, extra: any = {}) => {
    if (!userId || isBusy) return null
    setIsBusy(true)
    try {
      const res = await fetch('/api/movies/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, movieId, youtubeId, ...extra }),
      })
      const data = await res.json()
      return data
    } catch {
      return null
    } finally {
      setIsBusy(false)
    }
  }

  const handleLike = async () => {
    // Optimistic update
    const next = !liked
    setLiked(next)
    const result = await doAction('like')
    // Sync with server response
    if (result !== null && result.liked !== undefined) {
      setLiked(result.liked)
    }
  }

  const handleSave = async () => {
    const next = !saved
    setSaved(next)
    const result = await doAction('save')
    if (result !== null && result.saved !== undefined) {
      setSaved(result.saved)
    }
  }

  const handleReact = async (r: string) => {
    const next = reaction === r ? null : r
    setReaction(next)
    const result = await doAction('react', { reaction: r })
    if (result !== null && result.reaction !== undefined) {
      setReaction(result.reaction)
    }
  }

  const handleSubscribe = async () => {
    if (!userId || !channelId) return
    const next = !subscribed
    setSubscribed(next)
    try {
      await fetch('/api/movies/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          userId,
          movieId,
          youtubeId,
          channelId,
          channelName,
        }),
      })
    } catch {}
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/movies/${movieId}`
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {}
  }

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '0 16px', height: 40, borderRadius: 999,
    border: '1px solid #2D2D44', cursor: 'pointer',
    fontSize: 13, flexShrink: 0,
    fontFamily: 'system-ui, sans-serif',
    transition: 'opacity 150ms',
    backgroundColor: '#1A1A2E',
  }

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      {/* Like/Dislike pill */}
      <div style={{
        display: 'flex', alignItems: 'center',
        backgroundColor: '#1A1A2E', borderRadius: 999,
        border: '1px solid #2D2D44', overflow: 'hidden', flexShrink: 0,
      }}>
        <button
          onClick={() => handleReact('like')}
          disabled={!userId}
          style={{
            ...btnBase, border: 'none', borderRight: '1px solid #2D2D44',
            borderRadius: 0, backgroundColor: 'transparent',
            color: reaction === 'like' ? '#7C3AED' : '#9CA3AF',
          }}
        >
          <ThumbsUp size={16} fill={reaction === 'like' ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => handleReact('dislike')}
          disabled={!userId}
          style={{
            ...btnBase, border: 'none', borderRadius: 0,
            backgroundColor: 'transparent',
            color: reaction === 'dislike' ? '#EF4444' : '#9CA3AF',
          }}
        >
          <ThumbsDown size={16} fill={reaction === 'dislike' ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Like */}
      <button onClick={handleLike} disabled={!userId} style={{
        ...btnBase,
        backgroundColor: liked ? 'rgba(124,58,237,0.15)' : '#1A1A2E',
        borderColor: liked ? '#7C3AED' : '#2D2D44',
        color: liked ? '#A78BFA' : '#9CA3AF',
      }}>
        <ThumbsUp size={15} fill={liked ? 'currentColor' : 'none'} />
        {liked ? 'Liked' : 'Like'}
      </button>

      {/* Save */}
      <button onClick={handleSave} disabled={!userId} style={{
        ...btnBase,
        backgroundColor: saved ? 'rgba(124,58,237,0.15)' : '#1A1A2E',
        borderColor: saved ? '#7C3AED' : '#2D2D44',
        color: saved ? '#A78BFA' : '#9CA3AF',
      }}>
        <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'Saved' : 'Save'}
      </button>

      {/* Share */}
      <button onClick={handleShare} style={{ ...btnBase, color: '#9CA3AF' }}>
        <Share2 size={15} />
        Share
      </button>
    </div>
  )
}
