"use client"
import {
  useState, useEffect, useCallback
} from 'react'
import { getAllSaved } from '@/lib/db'

export interface ProfileData {
  username: string
  handle: string
  avatarColor: string
  downloadCount: number
  savedCount: number
  playedCount: number
}

const PROFILE_KEY      = 'pn_profile'
const LEGACY_PROF_KEY  = 'grovix_profile'
const DL_KEY           = 'pn_recent_dl'
const LEGACY_DL_KEY    = 'grovix_recent_dl'
const GAMES_KEY        = 'pn_recent_games'
const LEGACY_GAMES_KEY = 'grovix_recent_games'

/** One-time migration of old grovix_ keys → pn_ keys */
function migrateKeys(): void {
  try {
    const pairs: [string, string][] = [
      [LEGACY_PROF_KEY, PROFILE_KEY],
      [LEGACY_DL_KEY, DL_KEY],
      [LEGACY_GAMES_KEY, GAMES_KEY],
    ]
    for (const [oldK, newK] of pairs) {
      if (!localStorage.getItem(newK)) {
        const val = localStorage.getItem(oldK)
        if (val) {
          localStorage.setItem(newK, val)
          localStorage.removeItem(oldK)
        }
      }
    }
  } catch {
    // Silent — non-critical
  }
}

export const useProfile = () => {
  const [profile, setProfile] = useState<ProfileData>({
    username: 'Play Nexa User',
    handle: '@playnexa_user',
    avatarColor: '#7C5CFF',
    downloadCount: 0,
    savedCount: 0,
    playedCount: 0
  })
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    try {
      migrateKeys()

      // Load saved profile info
      const saved = localStorage.getItem(PROFILE_KEY)
      const profileData = saved ? JSON.parse(saved) : {}

      // Real counts from actual data
      const downloads: string[] = JSON.parse(
        localStorage.getItem(DL_KEY) || '[]'
      )
      const games: string[] = JSON.parse(
        localStorage.getItem(GAMES_KEY) || '[]'
      )

      // Real saved count from IndexedDB
      const savedMedia = await getAllSaved()

      setProfile({
        username:      profileData.username || 'Play Nexa User',
        handle:        profileData.handle   || '@playnexa_user',
        avatarColor:   profileData.avatarColor || '#7C5CFF',
        downloadCount: downloads.length,
        savedCount:    savedMedia.length,
        playedCount:   games.length
      })
    } catch {
      // keep defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfile() }, [])

  const updateProfile = useCallback((
    data: Partial<Pick<ProfileData,
      'username' | 'handle' | 'avatarColor'
    >>
  ) => {
    const current = JSON.parse(
      localStorage.getItem(PROFILE_KEY) || '{}'
    )
    const updated = { ...current, ...data }
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify(updated)
    )
    setProfile(prev => ({ ...prev, ...data }))
  }, [])

  return { profile, loading, updateProfile, loadProfile }
}
