// ── Play Nexa Movie Hooks ─────────────────────────────────────
// Zero YouTube Data API — uses Supabase + db-cache only
// useRef guard prevents double useEffect
// 500ms debounce on search

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchMoviesFromDB,
  fetchTrendingFromDB,
  searchMoviesFromDB,
  fetchDetailFromDB,
  fetchRelatedFromDB,
} from '@/lib/db-cache'
import type { YouTubeMovie } from '@/lib/types'

// ── useTrending ──

export const useTrending = () => {
  const [movies, setMovies] = useState<YouTubeMovie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false
    fetchTrendingFromDB(16)
      .then(data => {
        if (!cancelled) {
          setMovies(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load trending')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { movies, loading, error }
}

// ── useMovieCategory ──

export const useMovieCategory = (category: string) => {
  const [movies, setMovies] = useState<YouTubeMovie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchMoviesFromDB(category, 12)
      .then(data => {
        if (!cancelled) {
          setMovies(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load category')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [category])

  return { movies, loading, error }
}

// ── useMovieSearch ──

export const useMovieSearch = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<YouTubeMovie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await searchMoviesFromDB(query, 20)
        setResults(data)
      } catch {
        setError('Search failed')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await searchMoviesFromDB(q, 20)
      setResults(data)
    } catch {
      setError('Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { query, setQuery, results, loading, error, search }
}

// ── useVideoDetail ──

export const useVideoDetail = (videoId: string) => {
  const [movie, setMovie] = useState<YouTubeMovie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!videoId || fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchDetailFromDB(videoId)
      .then(data => {
        if (!cancelled) {
          if (data) {
            setMovie(data)
            setError(null)
          } else {
            setError('Movie not found')
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load movie')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [videoId])

  return { movie, loading, error }
}

// ── useRelatedMovies ──

export const useRelatedMovies = (title: string, currentVideoId: string) => {
  const [movies, setMovies] = useState<YouTubeMovie[]>([])
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!title || fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false
    setLoading(true)

    const searchQuery = title.split(' ').slice(0, 4).join(' ')
    fetchRelatedFromDB(searchQuery, [], '', 10)
      .then(data => {
        if (!cancelled) {
          setMovies(data.filter(m => m.videoId !== currentVideoId))
        }
      })
      .catch(() => {
        if (!cancelled) setMovies([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [title, currentVideoId])

  return { movies, loading }
}
