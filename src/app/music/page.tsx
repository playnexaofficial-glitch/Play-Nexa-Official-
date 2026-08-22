'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { useLocalMediaScanner } from '@/lib/media-scanner/useLocalMediaScanner'
import { useAudioPlayer, type LocalTrack } from '@/hooks/useAudioPlayer'
import { 
  ArrowLeft, 
  RotateCw, 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  FolderOpen,
  X,
  Volume2
} from 'lucide-react'

// Local storage key for persistent offline track metadata caching
const LS_CACHED_SONGS = 'playnexa_cached_songs'

export default function MusicLibraryPage() {
  const router = useRouter()
  const [showFullPlayer, setShowFullPlayer] = useState(false)

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  // Local media scanner with automatic pagination and permission handling
  const {
    files,
    isLoading,
    error: scanError,
    isNative,
    permissionState,
    pickFiles,
    requestScan,
    clear,
  } = useLocalMediaScanner('audio')

  // Audio player hook managing single shared HTMLAudioElement state
  const {
    tracks,
    currentTrack,
    currentIndex,
    isPlaying,
    isLoading: isBuffering,
    error: playError,
    currentTime,
    duration,
    progress,
    toggle,
    nextTrack,
    prevTrack,
    seek,
    playAt,
    loadTracks,
    formatTime,
  } = useAudioPlayer()

  const scanForMusic = async (): Promise<LocalTrack[]> => {
    try {
      if (!isNative) return []
      console.log('[Music] Starting Filesystem scan...')
      const result = await Filesystem.readdir({
        path: 'Music',
        directory: Directory.ExternalStorage
      })
      const audioFiles = result.files.filter(f => 
        f.name.endsWith('.mp3') || f.name.endsWith('.m4a') || f.name.endsWith('.wav')
      )
      
      const foundTracks: LocalTrack[] = []
      for (const f of audioFiles) {
        const stats = await Filesystem.stat({
          path: `Music/${f.name}`,
          directory: Directory.ExternalStorage
        })
        foundTracks.push({
          id: f.name,
          title: f.name.replace(/\.[^/.]+$/, ""),
          artist: 'Local File',
          uri: stats.uri,
          fileName: f.name
        })
      }
      console.log('[Music] Found tracks:', foundTracks.length)
      return foundTracks
    } catch (e) {
      console.error('[Music] Scan failed', e)
      return []
    }
  }

  // Initial load and scan
  useEffect(() => {
    const init = async () => {
      let tracksToLoad: LocalTrack[] = []
      
      if (isNative) {
        const found = await scanForMusic()
        if (found.length > 0) {
          tracksToLoad = found
        }
      }

      // If nothing found or not native, check cache
      if (tracksToLoad.length === 0) {
        const raw = localStorage.getItem(LS_CACHED_SONGS)
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              tracksToLoad = parsed
            }
          } catch (e) {
            console.error('[Music] Cache parse failed', e)
          }
        }
      }

      if (tracksToLoad.length > 0) {
        loadTracks(tracksToLoad)
      }
    }
    init()
  }, [isNative, loadTracks])

  // Sync cache when files change from web picker
  useEffect(() => {
    if (files.length > 0) {
      const mapped = files.map(f => ({
        id: f.id,
        uri: f.uri,
        title: f.name.replace(/\.[^/.]+$/, ""),
        artist: 'Local File',
        fileName: f.name
      }))
      loadTracks(mapped)
      localStorage.setItem(LS_CACHED_SONGS, JSON.stringify(mapped))
    }
  }, [files, loadTracks])

  const handleTrackSelect = (idx: number) => {
    playAt(idx)
    setShowFullPlayer(true)
  }

  return (
    <div className="min-h-screen relative flex flex-col" style={{ backgroundColor: '#0A0A0A' }}>
      
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-[#1A1A1A] sticky top-0 z-30 bg-[#0A0A0A]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white active:scale-95 transition-all"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Offline Music</h1>
            <p className="text-xs text-[#9CA3AF]">
              {isLoading
                ? 'Scanning tracks...'
                : `${tracks.length} song${tracks.length === 1 ? '' : 's'} loaded`}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            clear()
            if (isNative) {
              const found = await scanForMusic()
              loadTracks(found)
            } else {
              pickFiles()
            }
          }}
          disabled={isLoading}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-900/40 border border-violet-700/30 text-violet-300 hover:bg-violet-800/40 disabled:opacity-40 transition-all active:scale-95"
          title="Refresh scan"
        >
          <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* ── SCROLLABLE LIST ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {scanError && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs">
            {scanError}
          </div>
        )}

        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-violet-950/30 border border-violet-800/20 flex items-center justify-center mb-6">
              <Music className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-white text-lg font-bold mb-2">No offline songs</h2>
            <p className="text-[#9CA3AF] text-sm max-w-xs mb-8">
              Pick audio files from your device. All files stay 100% local and private.
            </p>
            {!isNative && (
              <button
                onClick={pickFiles}
                className="px-6 py-3 bg-violet-700 hover:bg-violet-600 rounded-full text-white font-semibold text-sm active:scale-95 transition-all flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Browse Audio Files
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, idx) => {
              const isActive = currentTrack?.id === track.id
              return (
                <div
                  key={track.id}
                  onClick={() => handleTrackSelect(idx)}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all active:scale-[0.99] border ${
                    isActive
                      ? 'bg-violet-950/20 border-violet-800/40'
                      : 'border-transparent'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-violet-700 text-white' : 'bg-[#141414] text-violet-400'
                  }`}>
                    <Music className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-violet-300' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  {isActive && isPlaying && (
                    <div className="flex items-end gap-[3px] h-3">
                      <span className="w-[3px] h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <span className="w-[3px] h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      <span className="w-[3px] h-3 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── FLOATING MINI PLAYER ── */}
      {currentTrack && !showFullPlayer && (
        <div 
          onClick={() => setShowFullPlayer(true)}
          className="fixed bottom-4 left-4 right-4 z-40 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between cursor-pointer shadow-xl backdrop-blur-md active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-violet-700 flex items-center justify-center text-white flex-shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-xs text-[#9CA3AF] truncate">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={toggle}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-700 text-white hover:bg-violet-600 active:scale-90 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>
            <button
              onClick={nextTrack}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 active:scale-90 transition-all"
            >
              <SkipForward className="w-4 h-4 fill-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── FULL SCREEN PLAYER SHEET ── */}
      {currentTrack && showFullPlayer && (
        <div className="fixed inset-0 z-50 bg-[#0B0B1E] flex flex-col p-6 animate-fade-in">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setShowFullPlayer(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs text-[#9CA3AF] uppercase font-bold tracking-wider">
              Now Playing
            </span>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>

          {/* Record Album visual */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="relative mb-8 flex items-center justify-center">
              {/* Outer glow aura */}
              <div
                className="absolute w-64 h-64 rounded-full bg-violet-600/10 blur-2xl"
                style={{
                  transform: isPlaying ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 1s ease',
                }}
              />
              {/* Record Disk container */}
              <div className="w-64 h-64 rounded-full border-4 border-zinc-800 flex items-center justify-center bg-zinc-950 relative overflow-hidden shadow-2xl animate-spin-slow"
                style={{
                  animationPlayState: isPlaying ? 'running' : 'paused',
                }}
              >
                {/* Vinyl Grooves texture */}
                <div className="absolute inset-0 opacity-15"
                  style={{
                    background: 'repeating-radial-gradient(circle, #000, #000 3px, #fff 4px, #000 5px)'
                  }}
                />
                <div className="w-24 h-24 rounded-full bg-violet-700 border-4 border-zinc-900 flex items-center justify-center text-white relative z-10">
                  <Music className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Title & Artist */}
            <div className="text-center max-w-sm px-4">
              <h2 className="text-white text-xl font-bold truncate">{currentTrack.title}</h2>
              <p className="text-[#9CA3AF] text-sm mt-1 truncate">{currentTrack.artist}</p>
            </div>

            {/* Error or buffering displays */}
            {playError && (
              <div style={{
                backgroundColor: '#1A1A2E',
                border: '1px solid #2D2D44',
                borderRadius: 12,
                padding: '12px 16px',
                margin: '8px 0',
              }}>
                <p style={{ color: '#EF4444', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>
                  {playError}
                </p>
                <p style={{ color: '#6B7280', fontSize: 11, marginTop: 4, fontFamily: 'system-ui, sans-serif' }}>
                  Try selecting the file again from your device
                </p>
              </div>
            )}
            {isBuffering && (
              <p className="text-violet-400 text-xs mt-3 animate-pulse">
                Buffering file...
              </p>
            )}
          </div>

          {/* Seek Bar Control Section */}
          <div className="px-6 mb-8">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              step={0.1}
              onChange={e => seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #7C3AED ${progress}%, #27272a ${progress}%)`
              }}
            />
            <div className="flex justify-between text-xs text-[#6B7280] mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls button row */}
          <div className="flex items-center justify-center gap-8 mb-12">
            <button
              onClick={prevTrack}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white active:scale-95 transition-all"
            >
              <SkipBack className="w-6 h-6 fill-white" />
            </button>

            <button
              onClick={toggle}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-violet-700 text-white hover:bg-violet-600 shadow-lg shadow-violet-700/20 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white ml-1" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white active:scale-95 transition-all"
            >
              <SkipForward className="w-6 h-6 fill-white" />
            </button>
          </div>
        </div>
      )}

      {/* Embedded inline spinning anims */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin 24s linear infinite;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
