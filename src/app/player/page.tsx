"use client"
import { useRouter } from 'next/navigation'
import VideoLibrary from '@/components/video/VideoLibrary'
import type { VideoFile } from '@/lib/mediaUtils'

export default function VideoLibraryPage() {
  const router = useRouter()

  const handleVideoSelect = (video: VideoFile) => {
    sessionStorage.setItem('playnexa_current_video', JSON.stringify(video))
    router.push('/player/watch')
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <VideoLibrary
        onVideoSelect={handleVideoSelect}
        onBack={() => router.back()}
      />
    </div>
  )
}
