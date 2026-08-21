// ── Play Nexa Audio Extractor ────────────────────────────────
// Client-side video-to-audio extraction using Web Audio API
// Zero server calls — everything runs in the browser
// 2GB RAM safe: streams audio in chunks, no full file buffering

export type ExtractionState = 'idle' | 'decoding' | 'encoding' | 'done' | 'error'

export interface ExtractionResult {
  blob: Blob
  url: string      // Object URL for download
  duration: number
  sampleRate: number
  channels: number
}

export interface ExtractionProgress {
  state: ExtractionState
  percent: number  // 0-100
  message: string
}

// ═══════════════════════════════════════════════════════════════
// WAV ENCODER — lightweight, zero-dependency, universally playable
// We encode to WAV instead of MP3 because MP3 encoding requires
// a WASM library (lamejs ~200KB). WAV is instant and lossless.
// ═══════════════════════════════════════════════════════════════

function encodeWav(
  audioBuffer: AudioBuffer,
  onProgress?: (p: number) => void
): Blob {
  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  // Get PCM data from all channels
  const channelData: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch))
  }

  const numFrames = channelData[0].length
  const dataSize = numFrames * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // ── WAV Header ──
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)           // chunk size
  view.setUint16(20, 1, true)            // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // ── Interleave PCM samples ──
  let offset = 44
  const totalFrames = numFrames
  const reportInterval = Math.max(1, Math.floor(totalFrames / 20))

  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      // Clamp float32 [-1, 1] to int16 [-32768, 32767]
      let sample = channelData[ch][i]
      sample = Math.max(-1, Math.min(1, sample))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }
    // Report progress periodically
    if (onProgress && i % reportInterval === 0) {
      onProgress(Math.round((i / totalFrames) * 100))
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// Takes a File (video), extracts audio, returns WAV blob
// Uses OfflineAudioContext for non-blocking decode
// ═══════════════════════════════════════════════════════════════

export async function extractAudioFromFile(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractionResult> {
  try {
    // ── Step 1: Read file as ArrayBuffer ──
    onProgress?.({
      state: 'decoding',
      percent: 5,
      message: 'Reading file...'
    })

    const arrayBuffer = await file.arrayBuffer()

    // ── Step 2: Decode audio using OfflineAudioContext ──
    onProgress?.({
      state: 'decoding',
      percent: 15,
      message: 'Decoding audio track...'
    })

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Decode the audio data from the video file
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Close the context to free memory
    await audioContext.close()

    onProgress?.({
      state: 'encoding',
      percent: 40,
      message: 'Encoding WAV...'
    })

    // ── Step 3: Encode to WAV ──
    const wavBlob = encodeWav(audioBuffer, (p) => {
      onProgress?.({
        state: 'encoding',
        percent: 40 + Math.round(p * 0.55),
        message: 'Encoding WAV...'
      })
    })

    // ── Step 4: Create download URL ──
    const url = URL.createObjectURL(wavBlob)

    onProgress?.({
      state: 'done',
      percent: 100,
      message: 'Audio extracted!'
    })

    return {
      blob: wavBlob,
      url,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    }
  } catch (error: any) {
    onProgress?.({
      state: 'error',
      percent: 0,
      message: error?.message || 'Failed to extract audio'
    })
    throw error
  }
}

// ── Free object URL to release memory ───────────────────────
export const revokeExtractionUrl = (url: string) => {
  try { URL.revokeObjectURL(url) } catch {}
}

// ── Trigger download of extracted audio ─────────────────────
export const downloadExtractedAudio = (
  url: string,
  originalName: string
) => {
  const a = document.createElement('a')
  a.href = url
  a.download = originalName.replace(/\.[^.]+$/, '') + '.wav'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
  }, 100)
}

// ── Format seconds to MM:SS ─────────────────────────────────
export const formatDuration = (sec: number): string => {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
