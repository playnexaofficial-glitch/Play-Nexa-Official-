'use client'

// ── Play Nexa MP3 Extractor ─────────────────────────────────
// Client-side video-to-audio extraction tool
// Uses Web Audio API (OfflineAudioContext) for non-blocking decode
// Encodes to WAV — zero WASM dependencies, universally playable
// 2GB RAM safe: streaming decode, chunked progress

import { useState, useCallback, useRef } from 'react'
import {
  Upload, FileAudio, Download, Loader2,
  CheckCircle, AlertCircle, Music, Zap
} from 'lucide-react'
import {
  extractAudioFromFile,
  downloadExtractedAudio,
  revokeExtractionUrl,
  formatDuration,
  type ExtractionProgress,
  type ExtractionResult
} from '@/lib/audio-extractor'

type Step = 'pick' | 'processing' | 'done' | 'error'

export default function MP3Extractor() {
  const [step, setStep]             = useState<Step>('pick')
  const [progress, setProgress]     = useState<ExtractionProgress | null>(null)
  const [result, setResult]         = useState<ExtractionResult | null>(null)
  const [fileName, setFileName]     = useState('')
  const [fileSize, setFileSize]     = useState(0)
  const [dragOver, setDragOver]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Handle file selection ──
  const handleFile = useCallback(async (file: File) => {
    // Validate it's a video
    if (!file.type.startsWith('video/')) {
      setStep('error')
      setProgress({
        state: 'error', percent: 0,
        message: 'Please select a video file (MP4, WEBM, MOV)'
      })
      return
    }

    setFileName(file.name)
    setFileSize(file.size)
    setStep('processing')

    try {
      const res = await extractAudioFromFile(file, (p) => {
        setProgress(p)
      })
      setResult(res)
      setStep('done')
    } catch (err: any) {
      setStep('error')
      setProgress({
        state: 'error', percent: 0,
        message: err?.message || 'Extraction failed'
      })
    }
  }, [])

  // ── File input change ──
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  // ── Drag & Drop ──
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  // ── Download extracted audio ──
  const handleDownload = useCallback(() => {
    if (!result) return
    downloadExtractedAudio(result.url, fileName)
  }, [result, fileName])

  // ── Reset ──
  const handleReset = useCallback(() => {
    if (result) revokeExtractionUrl(result.url)
    setStep('pick')
    setProgress(null)
    setResult(null)
    setFileName('')
    setFileSize(0)
  }, [result])

  // ── Format size ──
  const fmtSize = (b: number) => {
    if (b > 1073741824) return `${(b / 1073741824).toFixed(1)} GB`
    return `${(b / 1048576).toFixed(1)} MB`
  }

  return (
    <div className="space-y-5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={onFileChange}
        className="hidden"
      />

      {/* ── STEP 1: File Picker ── */}
      {step === 'pick' && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center py-10 px-6
                     rounded-2xl border-2 border-dashed cursor-pointer
                     transition-all duration-200
                     ${dragOver
                       ? 'border-[#7C5CFF] bg-[#7C5CFF]/10 scale-[1.02]'
                       : 'border-[#1E293B] bg-[#111827] active:scale-[0.98]'
                     }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4
                          transition-colors duration-200
                          ${dragOver ? 'bg-[#7C5CFF]/20' : 'bg-[#1E293B]'}`}>
            <Upload size={24} className={dragOver ? 'text-[#7C5CFF]' : 'text-[#94A3B8]'} />
          </div>
          <p className="text-white text-sm font-semibold mb-1">
            {dragOver ? 'Drop video here' : 'Select a video file'}
          </p>
          <p className="text-[#94A3B8] text-xs text-center">
            MP4, WEBM, MOV, AVI — any video format works
          </p>
          <p className="text-[#94A3B8]/50 text-[10px] mt-2">
            Audio will be extracted as WAV (lossless)
          </p>
        </div>
      )}

      {/* ── STEP 2: Processing ── */}
      {step === 'processing' && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5">
          {/* File info */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#7C5CFF]/15 flex items-center justify-center">
              <FileAudio size={20} className="text-[#7C5CFF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{fileName}</p>
              <p className="text-[#94A3B8] text-[10px]">{fmtSize(fileSize)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-2 bg-[#1E293B] rounded-full overflow-hidden mb-3">
            <div
              className="absolute inset-y-0 left-0 bg-[#7C5CFF] rounded-full
                         transition-all duration-300 ease-out"
              style={{ width: `${progress?.percent || 0}%` }}
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="text-[#7C5CFF] animate-spin" />
            <p className="text-[#94A3B8] text-xs">
              {progress?.message || 'Processing...'}
            </p>
          </div>

          {/* Progress percent */}
          <p className="text-[#7C5CFF] text-lg font-bold text-center mt-3">
            {progress?.percent || 0}%
          </p>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === 'done' && result && (
        <div className="space-y-4">
          {/* Success card */}
          <div className="bg-[#22C55E]/10 border border-[#22C55E]/25 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={24} className="text-[#22C55E]" />
              <div>
                <p className="text-white text-sm font-semibold">Audio Extracted!</p>
                <p className="text-[#94A3B8] text-[10px]">
                  {formatDuration(result.duration)} · {result.sampleRate / 1000}kHz · {result.channels}ch
                </p>
              </div>
            </div>

            {/* File details */}
            <div className="bg-[#0F172A] rounded-xl p-3 space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] text-[10px]">Source</span>
                <span className="text-white text-[10px] truncate max-w-[60%]">{fileName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] text-[10px]">Duration</span>
                <span className="text-white text-[10px]">{formatDuration(result.duration)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8] text-[10px]">Format</span>
                <span className="text-white text-[10px]">WAV (Lossless)</span>
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="w-full h-12 rounded-xl bg-[#7C5CFF] text-white
                         text-sm font-semibold flex items-center justify-center gap-2
                         active:scale-[0.97] transition-transform duration-150
                         shadow-[0_0_15px_rgba(124,92,255,0.3)]"
            >
              <Download size={16} />
              Download Audio
            </button>
          </div>

          {/* Extract another */}
          <button
            onClick={handleReset}
            className="w-full h-12 rounded-xl border border-[#1E293B]
                       text-[#94A3B8] text-sm font-medium
                       active:scale-[0.98] transition-transform duration-150"
          >
            Extract Another Video
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {step === 'error' && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={24} className="text-red-400" />
            <div>
              <p className="text-white text-sm font-semibold">Extraction Failed</p>
              <p className="text-[#94A3B8] text-xs">{progress?.message}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="w-full h-12 rounded-xl border border-[#1E293B]
                       text-[#94A3B8] text-sm font-medium
                       active:scale-[0.98] transition-transform duration-150"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Info section ── */}
      {step === 'pick' && (
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-[#00D4FF]" />
            <p className="text-white text-xs font-semibold">How It Works</p>
          </div>
          <div className="space-y-2">
            {[
              { icon: <Upload size={12} />, text: 'Select any video from your device' },
              { icon: <Music size={12} />, text: 'Web Audio API decodes the audio track' },
              { icon: <FileAudio size={12} />, text: 'Audio is encoded to WAV format' },
              { icon: <Download size={12} />, text: 'Download the extracted audio instantly' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7C5CFF]/10 flex items-center justify-center
                                text-[#7C5CFF] flex-shrink-0">
                  {item.icon}
                </div>
                <p className="text-[#94A3B8] text-xs">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
