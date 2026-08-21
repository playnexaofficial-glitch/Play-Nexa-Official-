'use client'
import { useState, useRef, useCallback,
  useEffect } from 'react'

export function useMusicPlayer() {
  const [isPlaying, setIsPlaying] =
    useState(false)
  const [currentTime, setCurrentTime] =
    useState(0)
  const [duration, setDuration] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement | null>(
    null)

  const progress = duration > 0
    ? (currentTime / duration) * 100 : 0

  const post = useCallback((data: any) => {
    iframeRef.current?.contentWindow
      ?.postMessage(JSON.stringify(data), '*')
  }, [])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com')
        return
      try {
        const d = typeof e.data === 'string'
          ? JSON.parse(e.data) : e.data
        if (d.event === 'onStateChange') {
          setIsPlaying(d.info === 1)
          if (d.info === 0) {
            // Track ended — signal to queue
            window.dispatchEvent(
              new CustomEvent('ytmusic:trackended'))
          }
        }
        if (d.event === 'infoDelivery' &&
            d.info?.currentTime !== undefined) {
          setCurrentTime(d.info.currentTime || 0)
          if (d.info.duration &&
              !isNaN(d.info.duration) &&
              isFinite(d.info.duration)) {
            setDuration(d.info.duration)
          }
        }
      } catch {}
    }
    window.addEventListener('message', handler)
    return () =>
      window.removeEventListener('message', handler)
  }, [])

  const togglePlay = useCallback(() => {
    post({
      event: 'command',
      func: isPlaying ? 'pauseVideo' : 'playVideo',
      args: [],
    })
  }, [isPlaying, post])

  const seek = useCallback((time: number) => {
    post({
      event: 'command',
      func: 'seekTo',
      args: [time, true],
    })
    setCurrentTime(time)
  }, [post])

  const formatTime = (s: number): string => {
    if (!s || isNaN(s) || !isFinite(s))
      return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2,'0')}`
  }

  return {
    iframeRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlay,
    seek,
    formatTime,
    setIsPlaying,
  }
}
