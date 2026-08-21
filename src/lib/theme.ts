export type Theme = 'dark' | 'amoled' | 'neon'

interface ThemeColors {
  bgPrimary: string
  bgSecondary: string
  bgCard: string
  border: string
  accent: string
  accentGlow: string
  textPrimary: string
  textMuted: string
}

export const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    bgPrimary:   '#070B14',
    bgSecondary: '#0F172A',
    bgCard:      '#111827',
    border:      '#1E293B',
    accent:      '#7C5CFF',
    accentGlow:  'rgba(124,92,255,0.15)',
    textPrimary: '#FFFFFF',
    textMuted:   '#94A3B8'
  },
  amoled: {
    bgPrimary:   '#000000',
    bgSecondary: '#0A0A0A',
    bgCard:      '#111111',
    border:      '#1A1A1A',
    accent:      '#7C5CFF',
    accentGlow:  'rgba(124,92,255,0.15)',
    textPrimary: '#FFFFFF',
    textMuted:   '#888888'
  },
  neon: {
    bgPrimary:   '#070B14',
    bgSecondary: '#0A0F1E',
    bgCard:      '#0D1520',
    border:      '#00FF8820',
    accent:      '#00FF88',
    accentGlow:  'rgba(0,255,136,0.15)',
    textPrimary: '#FFFFFF',
    textMuted:   '#94A3B8'
  }
}

export const applyTheme = (theme: Theme) => {
  const colors = THEMES[theme]
  const root   = document.documentElement

  root.style.setProperty('--bg-primary',   colors.bgPrimary)
  root.style.setProperty('--bg-secondary', colors.bgSecondary)
  root.style.setProperty('--bg-card',      colors.bgCard)
  root.style.setProperty('--border',       colors.border)
  root.style.setProperty('--accent',       colors.accent)
  root.style.setProperty('--accent-glow',  colors.accentGlow)
  root.style.setProperty('--text-primary', colors.textPrimary)
  root.style.setProperty('--text-muted',   colors.textMuted)

  // AMOLED: pure black body for OLED screens
  document.body.style.backgroundColor = colors.bgPrimary
}

export const applyPerformanceMode = (
  liteAnimation: boolean,
  batterySaver: boolean
) => {
  const style = document.getElementById('pn-perf')
    || document.createElement('style')
  style.id = 'pn-perf'

  if (liteAnimation || batterySaver) {
    style.textContent = `
      * {
        transition-duration: 50ms !important;
        animation-duration: 50ms !important;
      }
    `
  } else {
    style.textContent = ''
  }

  if (!document.getElementById('pn-perf')) {
    document.head.appendChild(style)
  }
}
