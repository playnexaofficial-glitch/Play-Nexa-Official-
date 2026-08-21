'use client'
import {
  useState, useEffect, useRef, useCallback
} from 'react'

export interface LocalTrack {
  id: string
  uri: string
  title: string
  artist: string
  duration?: number
  fileName: string
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(
    null)
  const [tracks, setTracks] = useState<
    LocalTrack[]>([])
  const [currentIndex, setCurrentIndex] =
    useState(0)
  const [isPlaying, setIsPlaying] =
    useState(false)
  const [currentTime, setCurrentTime] =
    useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const isInitialized = useRef(false)

  const currentTrack = tracks[currentIndex] || null

  // Initialize audio element ONCE
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const audio = new Audio()
    audio.preload = 'metadata'

    // CRITICAL for Android WebView:
    // These attributes prevent playback issues
    audio.crossOrigin = 'anonymous'

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime || 0)
    })

    audio.addEventListener('durationchange', () => {
      if (audio.duration &&
          !isNaN(audio.duration) &&
          isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    })

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration &&
          !isNaN(audio.duration) &&
          isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
      setIsLoading(false)
    })

    audio.addEventListener('canplaythrough', () => {
      setIsLoading(false)
      setError('')
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      // Trigger next track
      window.dispatchEvent(
        new CustomEvent('music:trackended'))
    })

    audio.addEventListener('error', (e) => {
      const err = audio.error
      let msg = 'Cannot play this file'
      if (err) {
        switch (err.code) {
          case 1: msg = 'Playback aborted'; break
          case 2: msg = 'Network error'; break
          case 3: msg = 'Decode error — ' +
            'file may be corrupted'; break
          case 4: msg = 'File not supported ' +
            'or not accessible'; break
        }
      }
      console.error('[AudioPlayer] Error:',
        msg, err?.code, audio.src)
      setError(msg)
      setIsPlaying(false)
      setIsLoading(false)
    })

    audio.addEventListener('waiting', () => {
      setIsLoading(true)
    })

    audio.addEventListener('playing', () => {
      setIsLoading(false)
      setIsPlaying(true)
      setError('')
    })

    audio.addEventListener('pause', () => {
      setIsPlaying(false)
    })

    audioRef.current = audio
  }, [])

  // Listen for track ended event
  useEffect(() => {
    const handler = () => {
      nextTrack()
    }
    window.addEventListener(
      'music:trackended', handler)
    return () =>
      window.removeEventListener(
        'music:trackended', handler)
  }, [tracks, currentIndex])

  // Load track when index or tracks change
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    setIsLoading(true)
    setError('')
    setCurrentTime(0)
    setDuration(0)

    console.log('[AudioPlayer] Loading:',
      currentTrack.title, currentTrack.uri)

    // Try the URI directly first
    // On Capacitor Android, uri should work
    const src = currentTrack.uri

    // Remove any existing src
    audio.pause()
    audio.removeAttribute('src')
    audio.load()

    // Set new src
    audio.src = src
    audio.load()

    console.log('[AudioPlayer] Set src:', src)

  }, [currentIndex, currentTrack?.uri])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      setError('')
      console.log('[AudioPlayer] Attempting play...')
      await audio.play()
      console.log('[AudioPlayer] Play success')
    } catch (e: any) {
      console.error('[AudioPlayer] Play failed:',
        e.message)
      setError('Playback failed: ' + e.message)
      setIsPlaying(false)
    }
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) play()
    else pause()
  }, [play, pause])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    if (isNaN(time) || !isFinite(time)) return
    audio.currentTime = Math.max(0,
      Math.min(time, audio.duration || 0))
    setCurrentTime(audio.currentTime)
  }, [])

  const nextTrack = useCallback(() => {
    setCurrentIndex(prev => {
      const next = (prev + 1) % Math.max(tracks.length, 1)
      return next
    })
    setTimeout(() => play(), 300)
  }, [tracks.length, play])

  const prevTrack = useCallback(() => {
    const audio = audioRef.current
    // If past 3 seconds, restart current
    if (audio && audio.currentTime > 3) {
      seek(0)
      return
    }
    setCurrentIndex(prev =>
      prev === 0 ? Math.max(tracks.length - 1, 0)
      : prev - 1)
    setTimeout(() => play(), 300)
  }, [tracks.length, play, seek])

  const playAt = useCallback(
    (index: number) => {
      setCurrentIndex(index)
      setTimeout(() => play(), 300)
    }, [play])

  const loadTracks = useCallback(
    (newTracks: LocalTrack[]) => {
      setTracks(newTracks)
      setCurrentIndex(0)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
    }, [])

  const progress = duration > 0
    ? Math.min((currentTime / duration) * 100, 100)
    : 0

  const formatTime = (s: number): string => {
    if (!s || isNaN(s) || !isFinite(s))
      return '0:00'
    const m = Math.floor(Math.abs(s) / 60)
    const sec = Math.floor(Math.abs(s) % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return {
    tracks,
    currentTrack,
    currentIndex,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    progress,
    toggle,
    play,
    pause,
    seek,
    nextTrack,
    prevTrack,
    playAt,
    loadTracks,
    formatTime,
  }
}
