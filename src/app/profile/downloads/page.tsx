// src/app/profile/downloads/page.tsx
// src/app/profile/downloads/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, Download, Video, Music } from 'lucide-react'

interface DownloadItem {
  id: string
  title: string
  thumbnail: string
  subtitle: string
  type: 'movie' | 'music'
  downloaded_at: string
}

export default function ProfileDownloadsPage() {
  const router = useRouter()
  const [items, setItems] = useState<DownloadItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pn_dl_history')
      if (saved) {
        setItems(JSON.parse(saved))
      }
    } catch {}
    setIsLoading(false)
  }, [])

  const removeItem = (id: string) => {
    const updated = items.filter((i) => i.id !== id)
    setItems(updated)
    localStorage.setItem('pn_dl_history', JSON.stringify(updated))
  }

  const clearAll = () => {
    setItems([])
    localStorage.removeItem('pn_dl_history')
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#1A1A2E] sticky top-0 z-40 bg-[#0D0D0D]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center text-white active:opacity-60 transition-opacity duration-150"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-white">Downloads</h1>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[#EF4444] text-xs font-semibold px-2 active:opacity-60 transition-opacity duration-150"
          >
            Clear All
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="px-4 mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-24 h-24 bg-[#1A1A2E] rounded-xl flex-shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2 py-2">
                <div className="h-4 bg-[#1A1A2E] rounded-full w-3/4 animate-pulse" />
                <div className="h-3 bg-[#1A1A2E] rounded-full w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#1A1A2E] flex items-center justify-center mb-6">
            <Download size={32} className="text-[#4B5563]" strokeWidth={1.5} />
          </div>
          <h2 className="text-white font-bold text-xl mb-3">No Downloads</h2>
          <p className="text-[#9CA3AF] text-sm max-w-[260px] leading-relaxed">
            Content you download for offline viewing will appear here.
          </p>
        </div>
      ) : (
        <div className="px-4 mt-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 items-center">
              <div className="relative flex-shrink-0">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className={`w-24 h-24 rounded-xl object-cover bg-[#1A1A2E] border border-[#2D2D44] ${
                    item.type === 'music' ? 'aspect-square' : ''
                  }`}
                />
                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm rounded-md p-1">
                  {item.type === 'movie' ? (
                    <Video size={10} color="white" />
                  ) : (
                    <Music size={10} color="white" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold line-clamp-2 leading-tight mb-1">
                  {item.title}
                </p>
                <p className="text-[#9CA3AF] text-xs truncate mb-1">
                  {item.subtitle}
                </p>
                <span className="text-[10px] text-[#6B7280]">
                  {new Date(item.downloaded_at).toLocaleDateString()}
                </span>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="w-10 h-10 flex items-center justify-center text-[#6B7280] active:opacity-60 transition-opacity duration-150"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
