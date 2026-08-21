export interface PlayNexaSettings {
  // Appearance
  theme: 'dark' | 'amoled' | 'neon'

  // Performance
  smoothMode: boolean
  batterySaver: boolean
  liteAnimation: boolean
  performanceBoost: boolean

  // Network
  lowDataMode: boolean
  smartLoading: boolean
  thumbnailQuality: 'low' | 'medium' | 'high'
}

// Backward-compat alias for gradual migration
export type GrovixSettings = PlayNexaSettings

const SETTINGS_KEY = 'pn_settings'
const LEGACY_KEY   = 'grovix_settings'

/** Migrate old grovix_settings → pn_settings (one-time, silent) */
function migrateSettingsKey(): void {
  try {
    if (!localStorage.getItem(SETTINGS_KEY)) {
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        localStorage.setItem(SETTINGS_KEY, legacy)
        localStorage.removeItem(LEGACY_KEY)
      }
    }
  } catch {
    // Silent — non-critical
  }
}

export const DEFAULT_SETTINGS: PlayNexaSettings = {
  theme: 'dark',
  smoothMode: true,
  batterySaver: false,
  liteAnimation: false,
  performanceBoost: false,
  lowDataMode: false,
  smartLoading: true,
  thumbnailQuality: 'medium'
}

export const getSettings = (): PlayNexaSettings => {
  try {
    migrateSettingsKey()
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const saveSettings = (
  settings: Partial<PlayNexaSettings>
): PlayNexaSettings => {
  try {
    const current = getSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(updated)
    )
    return updated
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const getSetting = <K extends keyof PlayNexaSettings>(
  key: K
): PlayNexaSettings[K] => {
  return getSettings()[key]
}

// Thumbnail URL based on quality setting
export const getThumbnailUrl = (
  videoId: string
): string => {
  const quality = getSetting('thumbnailQuality')
  const size = quality === 'high'
    ? 'maxresdefault'
    : quality === 'medium'
    ? 'hqdefault'
    : 'mqdefault'
  return `https://img.youtube.com/vi/${videoId}/${size}.jpg`
}
