'use client'

// ── Play Nexa Local Hub ─────────────────────────────────────
// Google Files / PLAYit inspired unified local media dashboard
// Pill toggle [Videos] [Audio] · Local search · Mini-player
// Gesture video overlay · MP3 extractor modal
// Each component owns its own header (< Video Player / < Music Player)
// 2GB RAM: URL.createObjectURL · content-visibility: auto · no backdrop-blur

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Video, Music, Search, X, Zap
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import VideoGridView from '@/components/local/VideoGridView'
import type { LocalVideo } from '@/components/local/VideoGridView'
import MusicListView from '@/components/local/MusicListView'
import type { LocalTrack } from '@/components/local/MusicListView'
import MiniPlayer from '@/components/local/MiniPlayer'
import VideoPlayer from '@/components/local/VideoPlayer'
import MP3ExtractorModal from '@/components/local/MP3ExtractorModal'

type View = 'videos' | 'music'

export default function LocalHubPage() {
  const router = useRouter()
  const [activeView, setActiveView] = useState<View>('videos')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  // ── Video player overlay ──
  const [activeVideo, setActiveVideo] = useState<LocalVideo | null>(null)

  // ── Audio mini-player ──
  const [currentTrack, setCurrentTrack] = useState<LocalTrack | null>(null)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [miniPlayerProgress, setMiniPlayerProgress] = useState(0)

  // ── Modals ──
  const [showExtractor, setShowExtractor]     = useState(false)
  const [extractorSource, setExtractorSource] = useState<{
    name: string; file: File | null
  }>({ name: '', file: null })

  // Store file references
  const videoFileMap = useRef<Map<string, File>>(new Map())
  const trackFileMap = useRef<Map<string, File>>(new Map())

  // ── Back handler ──
  const handleBack = useCallback(() => { router.back() }, [router])

  // ── Video playback ──
  const handlePlayVideo = useCallback((video: LocalVideo) => {
    if (video.file) videoFileMap.current.set(video.id, video.file)
    setActiveVideo(video)
  }, [])

  const handleCloseVideo = useCallback(() => {
    setActiveVideo(null)
  }, [])

  // ── Audio playback ──
  const handlePlayTrack = useCallback((track: LocalTrack) => {
    if (track.file) trackFileMap.current.set(track.id, track.file)
    setCurrentTrack(track)
    setIsPlaying(true)
  }, [])

  const handlePauseTrack = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleToggleAudio = useCallback(() => {
    setIsPlaying(p => !p)
  }, [])

  const handleNextTrack = useCallback(() => {
    setIsPlaying(false)
    setCurrentTrack(null)
  }, [])

  const handleCloseMiniPlayer = useCallback(() => {
    setCurrentTrack(null)
    setIsPlaying(false)
    setMiniPlayerProgress(0)
  }, [])

  // ── Convert to MP3 ──
  const handleConvertToMp3Video = useCallback((video: LocalVideo) => {
    setExtractorSource({ name: video.name, file: video.file ?? null })
    setShowExtractor(true)
  }, [])

  const handleConvertToMp3Track = useCallback((track: LocalTrack) => {
    setExtractorSource({ name: track.name, file: track.file ?? null })
    setShowExtractor(true)
  }, [])

  // ── Reset search when switching tabs ──
  useEffect(() => {
    setSearchQuery('')
  }, [activeView])

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* ════════════════════════════════════════════════════════
          STICKY CONTROL BAR — Tab toggle + Search
          Component headers handle their own back/title
          ════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-50 bg-black/95 border-b border-neutral-900">
        {/* ── Tab toggle ── */}
        <div className="px-3 pt-2 pb-1.5 flex items-center gap-2">
          {/* Pill toggle */}
          <div className="flex-1 flex bg-neutral-900/80 rounded-lg p-[3px] border border-neutral-800/50">
            {([
              { key: 'videos' as View, label: 'Videos', Icon: Video },
              { key: 'music' as View, label: 'Audio', Icon: Music },
            ]).map(tab => {
              const isActive = activeView === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveView(tab.key)}
                  className={`relative flex-1 h-7 rounded-md flex items-center justify-center gap-1.5
                             text-[11px] font-semibold tracking-wide transition-all duration-150
                             ${isActive
                               ? 'bg-[#7C3AED] text-white shadow-[0_0_10px_rgba(124,58,237,0.25)]'
                               : 'text-neutral-500 active:text-neutral-300'
                             }`}
                >
                  <tab.Icon size={12} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="px-3 pb-2">
          <div className={`flex items-center gap-2 bg-neutral-900 border rounded-lg px-2.5 h-8
                          transition-colors duration-150
                          ${searchFocused
                            ? 'border-[#7C3AED]/40'
                            : 'border-neutral-800/50'
                          }`}>
            <Search size={12} className="text-neutral-600 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={`Search ${activeView === 'videos' ? 'videos' : 'audio'}...`}
              className="flex-1 bg-transparent text-white text-[11px] outline-none
                         placeholder-neutral-600 min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 active:scale-90 transition-transform duration-100"
              >
                <X size={11} className="text-neutral-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          CONTENT AREA — Each component owns its own header
          Hidden/block for zero-latency tab switching
          ════════════════════════════════════════════════════════ */}
      <div className={activeView === 'videos' ? 'block' : 'hidden'}>
        <VideoGridView
          searchQuery={searchQuery}
          onPlay={handlePlayVideo}
          onConvertToMp3={handleConvertToMp3Video}
          onBack={handleBack}
        />
      </div>

      <div className={activeView === 'music' ? 'block' : 'hidden'}>
        <MusicListView
          searchQuery={searchQuery}
          currentTrackId={currentTrack?.id ?? null}
          isPlaying={isPlaying}
          onPlay={handlePlayTrack}
          onPause={handlePauseTrack}
          onConvertToMp3={handleConvertToMp3Track}
          onBack={handleBack}
        />
      </div>

      {/* ════════════════════════════════════════════════════════
          GESTURE HINT CARD (videos view only)
          ════════════════════════════════════════════════════════ */}
      {activeView === 'videos' && !activeVideo && (
        <div className="px-3 pt-4">
          <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={10} className="text-[#7C3AED]" />
              <p className="text-neutral-400 text-[9px] font-semibold uppercase tracking-wider">
                Gesture Controls
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black rounded-lg p-2.5">
                <p className="text-neutral-600 text-[8px] uppercase tracking-wider mb-0.5">
                  Left half
                </p>
                <p className="text-yellow-400 text-[10px] font-semibold">
                  ↕ Brightness
                </p>
              </div>
              <div className="bg-black rounded-lg p-2.5">
                <p className="text-neutral-600 text-[8px] uppercase tracking-wider mb-0.5">
                  Right half
                </p>
                <p className="text-[#06B6D4] text-[10px] font-semibold">
                  ↕ Volume
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          FULLSCREEN VIDEO PLAYER OVERLAY
          ════════════════════════════════════════════════════════ */}
      {activeVideo && activeVideo.url && (
        <div className="fixed inset-0 z-[9999] bg-black animate-[fade-in_200ms_ease-out]">
          <VideoPlayer
            src={activeVideo.url}
            title={activeVideo.name}
            onClose={handleCloseVideo}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          PERSISTENT MINI PLAYER
          Stays alive even when switching to Videos tab
          ════════════════════════════════════════════════════════ */}
      {currentTrack && !activeVideo && (
        <MiniPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          onToggle={handleToggleAudio}
          onNext={handleNextTrack}
          onClose={handleCloseMiniPlayer}
          onProgress={setMiniPlayerProgress}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          MP3 EXTRACTOR MODAL
          ════════════════════════════════════════════════════════ */}
      {showExtractor && (
        <MP3ExtractorModal
          sourceName={extractorSource.name}
          sourceFile={extractorSource.file}
          onClose={() => { setShowExtractor(false); setExtractorSource({ name: '', file: null }) }}
        />
      )}
    </div>
  )
}
