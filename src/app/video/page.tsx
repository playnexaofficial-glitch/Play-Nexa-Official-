'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LocalVideoPlayer from '@/components/video/LocalVideoPlayer'

export default function VideoPage() {
  const router = useRouter()

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <LocalVideoPlayer onBack={handleBack} />
    </div>
  )
}
