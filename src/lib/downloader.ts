// Real external download sources
// Auto-passes YouTube URL — user does NOT re-paste

export type MediaType = 'video' | 'short'

interface Source {
  id: string
  name: string
  buildUrl: (videoId: string, type: MediaType) => string
  supports: MediaType[]
}

const SOURCES: Source[] = [
  {
    id: 'snapsave',
    name: 'SnapSave',
    buildUrl: (videoId, type) => {
      const url =
        type === 'short'
          ? `https://www.youtube.com/shorts/${videoId}`
          : `https://www.youtube.com/watch?v=${videoId}`
      return `https://snapsave.app/result?url=${encodeURIComponent(url)}`
    },
    supports: ['video', 'short'],
  },
  {
    id: 'ssyoutube',
    name: 'SSYouTube',
    buildUrl: (videoId) => `https://ssyoutube.com/en/watch?v=${videoId}`,
    supports: ['video'],
  },
  {
    id: 'y2mate',
    name: 'Y2Mate',
    buildUrl: (videoId) => `https://www.y2mate.com/youtube/${videoId}`,
    supports: ['video'],
  },
  {
    id: 'savefrom',
    name: 'SaveFrom',
    buildUrl: (videoId) =>
      `https://en.savefrom.net/#url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
    supports: ['video', 'short'],
  },
]

// Get sources that support this media type
export const getSources = (type: MediaType): Source[] =>
  SOURCES.filter((s) => s.supports.includes(type))

// Build download URL for a source
export const buildDownloadUrl = (
  sourceId: string,
  videoId: string,
  type: MediaType
): string => {
  const source = SOURCES.find((s) => s.id === sourceId)
  if (!source) return ''
  return source.buildUrl(videoId, type)
}

// Open download in new tab
export const openDownload = (
  videoId: string,
  type: MediaType,
  sourceId = 'snapsave'
) => {
  const url = buildDownloadUrl(sourceId, videoId, type)
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}
