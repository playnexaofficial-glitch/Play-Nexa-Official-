'use client'

// ── Play Nexa Disguise Wrapper ───────────────────────────────
// Conditionally renders CalculatorDisguise over the entire app
// when disguise mode is active
// Seamless mount/unmount — zero-latency switch
// Uses DisguiseContext with robust localStorage persistence

import { useDisguise } from '@/lib/disguise-context'
import CalculatorDisguise from '@/components/settings/CalculatorDisguise'

export default function DisguiseWrapper({ children }: { children: React.ReactNode }) {
  const { disguised } = useDisguise()

  if (disguised) {
    return <CalculatorDisguise />
  }

  return <>{children}</>
}
