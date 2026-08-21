// ═══════════════════════════════════════════════════════════════
// GROVIX — useGameData Hook (React Integration)
// ═══════════════════════════════════════════════════════════════
// Lightweight React hook for game data + leaderboard
// Auto-syncs pending scores on mount
// Zero continuous polling. Fetches on-demand.
// ═══════════════════════════════════════════════════════════════

"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchUserGameData, fetchGameScore, fetchUserCoins,
  fetchLeaderboard, updateGameScore, deductCoins,
  syncPendingScores, calculateCoins,
  type GameScoreData, type UserCoinsData, type LeaderboardEntry, type ScoreUpdateResult,
} from '@/lib/game-data'

export interface GameDataState {
  gameData: GameScoreData[]
  coins: UserCoinsData
  leaderboard: LeaderboardEntry[]
  loading: boolean
  error: string | null
}

export const useGameData = (authUserId?: string | null) => {
  const [state, setState] = useState<GameDataState>({
    gameData: [],
    coins: { totalCoins: 0, gameCoins: 0, gamesPlayed: 0 },
    leaderboard: [],
    loading: false,
    error: null,
  })

  const mountedRef = useRef(true)
  const lastFetchRef = useRef(0)

  const refreshAll = useCallback(async () => {
    if (!authUserId || !mountedRef.current) return
    const now = Date.now()
    if (now - lastFetchRef.current < 2000) return
    lastFetchRef.current = now

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      await syncPendingScores(authUserId)
      const [gameData, coins] = await Promise.all([
        fetchUserGameData(authUserId),
        fetchUserCoins(authUserId),
      ])

      if (mountedRef.current) {
        setState(prev => ({ ...prev, gameData, coins, loading: false }))
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, loading: false, error: err?.message || 'Failed to load game data' }))
      }
    }
  }, [authUserId])

  const refreshLeaderboard = useCallback(async (gameSlug?: string) => {
    try {
      const leaderboard = await fetchLeaderboard(gameSlug, 10)
      if (mountedRef.current) setState(prev => ({ ...prev, leaderboard }))
    } catch {}
  }, [])

  const submitScore = useCallback(async (
    gameSlug: string, score: number, gameDurationSec: number = 0,
  ): Promise<ScoreUpdateResult> => {
    if (!authUserId) return { success: false, highScore: score, coins: 0, plays: 0, isNewHighScore: false }

    const current = await fetchGameScore(authUserId, gameSlug)
    const isNewHigh = !current || score > current.highScore
    const coinsEarned = calculateCoins(score, gameDurationSec, isNewHigh)
    const result = await updateGameScore(authUserId, gameSlug, score, coinsEarned)

    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        coins: { ...prev.coins, totalCoins: prev.coins.totalCoins + coinsEarned },
      }))
      refreshAll()
    }

    return result
  }, [authUserId, refreshAll])

  const spendCoins = useCallback(async (amount: number) => {
    if (!authUserId) return { success: false, remainingCoins: 0 }
    const result = await deductCoins(authUserId, amount)
    if (result.success && mountedRef.current) {
      setState(prev => ({ ...prev, coins: { ...prev.coins, totalCoins: result.remainingCoins } }))
    }
    return result
  }, [authUserId])

  useEffect(() => {
    mountedRef.current = true
    if (authUserId) refreshAll()
    return () => { mountedRef.current = false }
  }, [authUserId, refreshAll])

  return { ...state, refreshAll, refreshLeaderboard, submitScore, spendCoins }
}

// ── Standalone hooks ──

export const useLeaderboard = (gameSlug?: string) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchLeaderboard(gameSlug, 10)
      if (mountedRef.current) setLeaderboard(data)
    } catch {}
    if (mountedRef.current) setLoading(false)
  }, [gameSlug])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    return () => { mountedRef.current = false }
  }, [refresh])

  return { leaderboard, loading, refresh }
}

export const useCoins = (authUserId?: string | null) => {
  const [coins, setCoins] = useState<UserCoinsData>({ totalCoins: 0, gameCoins: 0, gamesPlayed: 0 })
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!authUserId) return
    try {
      const data = await fetchUserCoins(authUserId)
      if (mountedRef.current) setCoins(data)
    } catch {}
  }, [authUserId])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    return () => { mountedRef.current = false }
  }, [refresh])

  return { coins, refresh }
}
