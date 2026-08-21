// ═══════════════════════════════════════════════════════════════
// GROVIX — Game Data Controller (Supabase Gamification)
// ═══════════════════════════════════════════════════════════════
// Ultra-lightweight service for game scores, coins, and leaderboard
// Uses Supabase RPC functions for all DB operations
// Zero continuous background loops. Fire-and-forget writes.
// 2GB RAM safe. No memory leaks.
// ═══════════════════════════════════════════════════════════════

import { getSupabase, SupabaseGameData, SupabaseUserProfile } from './supabase'
import { cacheGet, cacheSet } from './cache'

// ── Types ──

export interface GameScoreData {
  gameSlug: string
  highScore: number
  coins: number
  plays: number
  lastPlayed: string
}

export interface UserCoinsData {
  totalCoins: number
  gameCoins: number
  gamesPlayed: number
}

export interface LeaderboardEntry {
  rank: number
  displayName: string
  avatarUrl: string | null
  gameSlug: string
  highScore: number
  coins: number
  plays: number
}

export interface ScoreUpdateResult {
  success: boolean
  highScore: number
  coins: number
  plays: number
  isNewHighScore: boolean
}

// ── Cache Keys & TTL ──

const CACHE_KEY_GAME_DATA = 'grovix_game_data'
const CACHE_KEY_COINS = 'grovix_user_coins'
const CACHE_KEY_LEADERBOARD = 'grovix_leaderboard'
const CACHE_TTL_GAME = 2 * 60 * 1000
const CACHE_TTL_LEADERBOARD = 5 * 60 * 1000
const CACHE_TTL_COINS = 1 * 60 * 1000

// ── Timeout guard ──

const DB_TIMEOUT = 3000

const withTimeout = <T>(promise: Promise<T>, ms = DB_TIMEOUT): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DB_TIMEOUT')), ms)
    ),
  ])


// ═══════════════════════════════════════════════════════════════
// 1. FETCH USER GAME DATA
// ═══════════════════════════════════════════════════════════════

export const fetchUserGameData = async (
  authUserId: string,
): Promise<GameScoreData[]> => {
  if (!authUserId) return []

  const cached = cacheGet<GameScoreData[]>(`${CACHE_KEY_GAME_DATA}_${authUserId}`)
  if (cached && cached.length > 0) return cached

  try {
    const sb = getSupabase()
    const { data, error } = await withTimeout(
      sb.rpc('fetch_user_game_data', { p_auth_user_id: authUserId })
    )

    if (error || !data) return []

    const result: GameScoreData[] = (data as any[]).map(row => ({
      gameSlug: row.game_slug,
      highScore: row.high_score,
      coins: row.coins,
      plays: row.plays,
      lastPlayed: row.last_played,
    }))

    cacheSet(`${CACHE_KEY_GAME_DATA}_${authUserId}`, result)
    return result
  } catch { return [] }
}


// ═══════════════════════════════════════════════════════════════
// 2. FETCH SINGLE GAME SCORE
// ═══════════════════════════════════════════════════════════════

export const fetchGameScore = async (
  authUserId: string,
  gameSlug: string,
): Promise<{ highScore: number; coins: number; plays: number } | null> => {
  if (!authUserId || !gameSlug) return null

  try {
    const sb = getSupabase()
    const { data, error } = await withTimeout(
      sb.rpc('fetch_game_score', {
        p_auth_user_id: authUserId,
        p_game_slug: gameSlug,
      })
    )

    if (error || !data || !(data as any[]).length) return null

    const row = (data as any[])[0]
    return { highScore: row.high_score, coins: row.coins, plays: row.plays }
  } catch { return null }
}


// ═══════════════════════════════════════════════════════════════
// 3. UPDATE / ADD GAME SCORE (Upsert)
// ═══════════════════════════════════════════════════════════════

export const updateGameScore = async (
  authUserId: string,
  gameSlug: string,
  score: number,
  coinsEarned: number = 0,
): Promise<ScoreUpdateResult> => {
  const fallback: ScoreUpdateResult = {
    success: false, highScore: score, coins: coinsEarned,
    plays: 1, isNewHighScore: false,
  }

  if (!authUserId || !gameSlug) return fallback

  try {
    const current = await fetchGameScore(authUserId, gameSlug)
    const isNewHighScore = !current || score > current.highScore

    const sb = getSupabase()
    const { data, error } = await withTimeout(
      sb.rpc('upsert_game_score', {
        p_auth_user_id: authUserId,
        p_game_slug: gameSlug,
        p_score: score,
        p_coins_earned: coinsEarned,
      })
    )

    if (error || !data || !(data as any[]).length) {
      saveScoreLocally(gameSlug, score, coinsEarned)
      return { ...fallback, isNewHighScore }
    }

    const row = (data as any[])[0]
    invalidateGameDataCache(authUserId)

    return {
      success: true,
      highScore: row.high_score,
      coins: row.coins,
      plays: row.plays,
      isNewHighScore,
    }
  } catch {
    saveScoreLocally(gameSlug, score, coinsEarned)
    return { ...fallback, isNewHighScore: true }
  }
}


// ═══════════════════════════════════════════════════════════════
// 4. FETCH USER TOTAL COINS
// ═══════════════════════════════════════════════════════════════

export const fetchUserCoins = async (
  authUserId: string,
): Promise<UserCoinsData> => {
  const empty: UserCoinsData = { totalCoins: 0, gameCoins: 0, gamesPlayed: 0 }
  if (!authUserId) return empty

  const cached = cacheGet<UserCoinsData>(`${CACHE_KEY_COINS}_${authUserId}`)
  if (cached) return cached

  try {
    const sb = getSupabase()
    const { data, error } = await withTimeout(
      sb.rpc('fetch_user_coins', { p_auth_user_id: authUserId })
    )

    if (error || !data || !(data as any[]).length) return empty

    const row = (data as any[])[0]
    const result: UserCoinsData = {
      totalCoins: row.total_coins || 0,
      gameCoins: row.game_coins || 0,
      gamesPlayed: row.games_played || 0,
    }

    cacheSet(`${CACHE_KEY_COINS}_${authUserId}`, result)
    return result
  } catch { return empty }
}


// ═══════════════════════════════════════════════════════════════
// 5. FETCH LEADERBOARD
// ═══════════════════════════════════════════════════════════════

export const fetchLeaderboard = async (
  gameSlug?: string,
  limit: number = 10,
): Promise<LeaderboardEntry[]> => {
  const cacheKey = `${CACHE_KEY_LEADERBOARD}_${gameSlug || 'all'}`
  const cached = cacheGet<LeaderboardEntry[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  try {
    const sb = getSupabase()
    const { data, error } = await withTimeout(
      sb.rpc('fetch_leaderboard', {
        p_game_slug: gameSlug || null,
        p_limit: limit,
      })
    )

    if (error || !data) return []

    const result: LeaderboardEntry[] = (data as any[]).map(row => ({
      rank: row.rank,
      displayName: row.display_name || 'Grovix User',
      avatarUrl: row.avatar_url,
      gameSlug: row.game_slug,
      highScore: row.high_score,
      coins: row.coins,
      plays: row.plays,
    }))

    cacheSet(cacheKey, result)
    return result
  } catch { return [] }
}


// ═══════════════════════════════════════════════════════════════
// 6. DEDUCT COINS
// ═══════════════════════════════════════════════════════════════

export const deductCoins = async (
  authUserId: string,
  amount: number,
): Promise<{ success: boolean; remainingCoins: number }> => {
  if (!authUserId || amount <= 0) return { success: false, remainingCoins: 0 }

  try {
    const sb = getSupabase()
    const { data, error } = await withTimeout(
      sb.rpc('deduct_user_coins', {
        p_auth_user_id: authUserId,
        p_amount: amount,
      })
    )

    if (error || !data || !(data as any[]).length) {
      return { success: false, remainingCoins: 0 }
    }

    const row = (data as any[])[0]
    invalidateGameDataCache(authUserId)

    return { success: row.success, remainingCoins: row.remaining_coins }
  } catch { return { success: false, remainingCoins: 0 } }
}


// ═══════════════════════════════════════════════════════════════
// 7. LOCAL SCORE BACKUP (when Supabase is unreachable)
// ═══════════════════════════════════════════════════════════════

const LOCAL_SCORES_KEY = 'grovix_pending_scores'

interface PendingScore {
  gameSlug: string
  score: number
  coinsEarned: number
  timestamp: number
}

const saveScoreLocally = (gameSlug: string, score: number, coinsEarned: number): void => {
  try {
    const pending: PendingScore[] = JSON.parse(
      localStorage.getItem(LOCAL_SCORES_KEY) || '[]'
    )
    pending.push({ gameSlug, score, coinsEarned, timestamp: Date.now() })
    if (pending.length > 50) pending.splice(0, pending.length - 50)
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(pending))
  } catch {}
}

export const getPendingScores = (): PendingScore[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SCORES_KEY) || '[]')
  } catch { return [] }
}

export const clearPendingScores = (): void => {
  try { localStorage.removeItem(LOCAL_SCORES_KEY) } catch {}
}

export const syncPendingScores = async (authUserId: string): Promise<number> => {
  const pending = getPendingScores()
  if (!pending.length || !authUserId) return 0

  let synced = 0
  for (const entry of pending) {
    try {
      const result = await updateGameScore(authUserId, entry.gameSlug, entry.score, entry.coinsEarned)
      if (result.success) synced++
    } catch { break }
  }

  if (synced === pending.length) clearPendingScores()
  return synced
}


// ═══════════════════════════════════════════════════════════════
// 8. CACHE INVALIDATION
// ═══════════════════════════════════════════════════════════════

const invalidateGameDataCache = (authUserId: string): void => {
  try {
    [`${CACHE_KEY_GAME_DATA}_${authUserId}`, `${CACHE_KEY_COINS}_${authUserId}`]
      .forEach(key => { try { localStorage.removeItem(key) } catch {} })
  } catch {}
}


// ═══════════════════════════════════════════════════════════════
// 9. COINS CALCULATOR (Client-Side)
// ═══════════════════════════════════════════════════════════════

export const calculateCoins = (
  score: number,
  gameDurationSec: number,
  isNewHighScore: boolean,
): number => {
  let coins = Math.floor(score / 100)
  const minutes = Math.max(1, Math.floor(gameDurationSec / 60))
  coins += minutes
  if (isNewHighScore) coins = coins * 2
  return Math.min(coins, 50)
}
