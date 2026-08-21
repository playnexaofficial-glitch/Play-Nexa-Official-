'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface MusicTrack {
  id: string
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
  channel_id: string
}

type RepeatMode = 'none' | 'one' | 'all'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useMusicQueue(
  userId?: string | null
) {
  const [queue, setQueue] = useState<MusicTrack[]>(
    [])
  const [currentIndex, setCurrentIndex] =
    useState(0)
  const [shuffleMode, setShuffleMode] =
    useState(false)
  const [repeatMode, setRepeatMode] =
    useState<RepeatMode>('none')

  const currentTrack = queue[currentIndex] || null

  const buildQueue = useCallback(
    async (
      seed: MusicTrack,
      allTracks: MusicTrack[]
    ) => {
      if (!allTracks.length) {
        setQueue([seed])
        setCurrentIndex(0)
        return
      }

      let built: MusicTrack[] = []

      if (userId && supabase) {
        const [{ data: histData },
          { data: likeData }] =
          await Promise.all([
            supabase.from('music_history')
              .select('track_id,' +
                'music_tracks(channel_id)')
              .eq('user_id', userId)
              .order('played_at',
                { ascending: false })
              .limit(80),
            supabase.from('music_likes')
              .select('track_id,' +
                'music_tracks(channel_id)')
              .eq('user_id', userId)
              .limit(80),
          ])

        // Build preferred channel set from history
        const chanFreq = new Map<string, number>()
        for (const h of histData || []) {
          const cid =
            (h as any).music_tracks?.channel_id
          if (cid) chanFreq.set(cid,
            (chanFreq.get(cid) || 0) + 1)
        }
        for (const l of likeData || []) {
          const cid =
            (l as any).music_tracks?.channel_id
          if (cid) chanFreq.set(cid,
            (chanFreq.get(cid) || 0) + 2)
          // Likes weighted more
        }

        const prefChannels = new Set(
          [...chanFreq]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id))

        const sameChannel = allTracks.filter(
          t => t.id !== seed.id &&
            t.channel_id === seed.channel_id)
        const preferred = allTracks.filter(
          t => t.id !== seed.id &&
            t.channel_id !== seed.channel_id &&
            prefChannels.has(t.channel_id))
        const others = allTracks.filter(
          t => t.id !== seed.id &&
            t.channel_id !== seed.channel_id &&
            !prefChannels.has(t.channel_id))

        built = [
          seed,
          ...shuffle(sameChannel).slice(0, 15),
          ...shuffle(preferred).slice(0, 20),
          ...shuffle(others).slice(0, 15),
        ]
      } else {
        const same = allTracks.filter(
          t => t.id !== seed.id &&
            t.channel_id === seed.channel_id)
        const rest = allTracks.filter(
          t => t.id !== seed.id &&
            t.channel_id !== seed.channel_id)
        built = [
          seed,
          ...shuffle(same).slice(0, 15),
          ...shuffle(rest).slice(0, 15),
        ]
      }

      setQueue(built)
      setCurrentIndex(0)

      // Record play history
      if (userId && supabase) {
        Promise.resolve(
          supabase.from('music_history')
            .upsert([{
              user_id: userId,
              track_id: seed.id,
              played_at: new Date().toISOString(),
            }], { onConflict: 'user_id,track_id' })
        ).catch(() => {})
      }
    }, [userId])

  const playTrack = useCallback(
    (track: MusicTrack, allTracks: MusicTrack[]) => {
      buildQueue(track, allTracks)
    }, [buildQueue])

  const nextTrack = useCallback(() => {
    if (!queue.length) return
    if (repeatMode === 'one') return
    const next = shuffleMode
      ? Math.floor(Math.random() * queue.length)
      : currentIndex + 1
    if (next >= queue.length) {
      if (repeatMode === 'all')
        setCurrentIndex(0)
      return
    }
    setCurrentIndex(next)

    // Record history for new track
    const nextT = queue[next]
    if (userId && nextT && supabase) {
      Promise.resolve(
        supabase.from('music_history')
          .upsert([{
            user_id: userId,
            track_id: nextT.id,
            played_at: new Date().toISOString(),
          }], { onConflict: 'user_id,track_id' })
      ).catch(() => {})
    }
  }, [queue, currentIndex, shuffleMode,
    repeatMode, userId])

  const prevTrack = useCallback(() => {
    const prev = currentIndex - 1
    if (prev < 0) return
    setCurrentIndex(prev)
  }, [currentIndex])

  const toggleShuffle = useCallback(() => {
    setShuffleMode(s => !s)
  }, [])

  const toggleRepeat = useCallback(() => {
    setRepeatMode(r =>
      r === 'none' ? 'all'
      : r === 'all' ? 'one'
      : 'none')
  }, [])

  return {
    currentTrack,
    queue,
    currentIndex,
    shuffleMode,
    repeatMode,
    queueLength: queue.length,
    playTrack,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
  }
}
