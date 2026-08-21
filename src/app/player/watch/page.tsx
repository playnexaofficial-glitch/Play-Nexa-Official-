"use client"
import { useRouter } from 'next/navigation'
import VideoPlayer from '@/components/video/VideoPlayer'

export default function VideoWatchPage() {
  const router = useRouter()

  return (
    <VideoPlayer onBack={() => router.push('/player')} />
  )
}
