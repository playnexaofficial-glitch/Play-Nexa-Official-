'use client'

// ── Play Nexa MP3 Extractor Modal ───────────────────────────
// Full-screen overlay for client-side video-to-audio extraction
// Web Audio API decodeAudioData → WAV encoder
// Zero server calls · Progress bar · One-tap download

import { useState, useCallback } from 'react'
import {
  Upload, FileAudio, Download, Loader2,
  CheckCircle, AlertCircle, Music, X, Zap
} from 'lucide-react'
import {
  extractAudioFromFile,
  downloadExtractedAudio,
  revokeExtractionUrl,
  formatDuration,
  type ExtractionProgress,
  type ExtractionResult
} from '@/lib/audio-extractor'

interface MP3ExtractorModalProps {
  sourceName: string
  sourceFile: File | null
  onClose: () => void
}

type Step = 'processing' | 'done' | 'error'

export default function MP3ExtractorModal({
  sourceName, sourceFile, onClose
}: MP3ExtractorModalProps) {
  const [step, setStep]             = useState<Step>('processing')
  const [progress, setProgress]     = useState<ExtractionProgress>({
    state: 'decoding', percent: 5, message: 'Starting...'
  })
  const [result, setResult]         = useState<ExtractionResult | null>(null)
  const [errorMsg, setErrorMsg]     = useState('')

  // ── Start extraction on mount ──
  useState(() => {
    if (!sourceFile) {
      setStep('error')
      setErrorMsg('No file provided')
      return
    }

    extractAudioFromFile(sourceFile, (p) => {
      setProgress(p)
      if (p.state === 'done') setStep('done')
      if (p.state === 'error') {
        setStep('error')
        setErrorMsg(p.message)
      }
    }).then((res) => {
      setResult(res)
      setStep('done')
    }).catch((err: any) => {
      setStep('error')
      setErrorMsg(err?.message || 'Extraction failed')
    })
  })

  // ── Download ──
  const handleDownload = useCallback(() => {
    if (!result) return
    downloadExtractedAudio(result.url, sourceName)
  }, [result, sourceName])

  // ── Close and cleanup ──
  const handleClose = useCallback(() => {
    if (result) revokeExtractionUrl(result.url)
    onClose()
  }, [result, onClose])

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full
                   bg-neutral-900 border border-neutral-800
                   flex items-center justify-center
                   active:scale-90 transition-transform duration-100"
      >
        <X size={18} className="text-neutral-400" />
      </button>

      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        {/* ── PROCESSING ── */}
        {step === 'processing' && (
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#7C5CFF]/10 flex items-center justify-center mb-4">
                <Loader2 size={28} className="text-[#7C5CFF] animate-spin" />
              </div>
              <h2 className="text-white text-lg font-bold mb-1">Extracting Audio</h2>
              <p className="text-neutral-500 text-xs text-center">
                {sourceName}
              </p>
            </div>

            {/* Progress */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="relative w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-3">
                <div
                  className="absolute inset-y-0 left-0 bg-[#7C5CFF] rounded-full
                             transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-[#7C5CFF] text-2xl font-bold text-center">
                {progress.percent}%
              </p>
              <p className="text-neutral-500 text-xs text-center mt-1">
                {progress.message}
              </p>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && result && (
          <div className="w-full max-w-sm space-y-5">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center mb-4">
                <CheckCircle size={28} className="text-[#22C55E]" />
              </div>
              <h2 className="text-white text-lg font-bold mb-1">Audio Extracted!</h2>
              <p className="text-neutral-500 text-xs">
                {formatDuration(result.duration)} · {result.sampleRate / 1000}kHz · {result.channels}ch
              </p>
            </div>

            {/* File info */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-600 text-[10px]">Source</span>
                <span className="text-neutral-300 text-[10px] truncate max-w-[60%]">{sourceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 text-[10px]">Format</span>
                <span className="text-neutral-300 text-[10px]">WAV (Lossless)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 text-[10px]">Duration</span>
                <span className="text-neutral-300 text-[10px]">{formatDuration(result.duration)}</span>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full h-12 rounded-xl bg-[#7C5CFF] text-white
                         text-sm font-semibold flex items-center justify-center gap-2
                         active:scale-[0.97] transition-transform duration-150
                         shadow-[0_0_20px_rgba(124,92,255,0.3)]"
            >
              <Download size={16} />
              Download Audio
            </button>

            <button
              onClick={handleClose}
              className="w-full h-12 rounded-xl border border-neutral-800
                         text-neutral-500 text-sm font-medium
                         active:scale-[0.98] transition-transform duration-150"
            >
              Close
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div className="w-full max-w-sm space-y-5">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                <AlertCircle size={28} className="text-red-400" />
              </div>
              <h2 className="text-white text-lg font-bold mb-1">Extraction Failed</h2>
              <p className="text-neutral-500 text-xs text-center">{errorMsg}</p>
            </div>

            <button
              onClick={handleClose}
              className="w-full h-12 rounded-xl border border-neutral-800
                         text-neutral-500 text-sm font-medium
                         active:scale-[0.98] transition-transform duration-150"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
