// ── Play Nexa — Games Page ──────────────────────────────────────
// Thin wrapper that renders the GameHub component.
// All logic lives in GameHub for reusability.

'use client'

import GameHub from '@/components/games/GameHub'

export default function GamesPage() {
  return <GameHub />
}
