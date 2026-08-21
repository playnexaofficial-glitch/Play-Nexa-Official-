"use client"
import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  title?: string
  text?: string
  url?: string
}

const SHARE_APPS = [
  {
    name: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    buildUrl: (text: string, url: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
  },
  {
    name: 'Telegram',
    icon: '✈️',
    color: '#0088CC',
    buildUrl: (text: string, url: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  },
  {
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    buildUrl: (_: string, url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  },
  {
    name: 'Twitter',
    icon: '🐦',
    color: '#1DA1F2',
    buildUrl: (text: string, url: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  },
  {
    name: 'Instagram',
    icon: '📷',
    color: '#E1306C',
    buildUrl: (_: string, url: string) => {
      // Instagram doesn't support direct share URL
      // Copy to clipboard instead
      navigator.clipboard.writeText(url)
      return ''
    }
  },
  {
    name: 'SMS',
    icon: '💬',
    color: '#22C55E',
    buildUrl: (text: string, url: string) =>
      `sms:?body=${encodeURIComponent(text + ' ' + url)}`
  },
  {
    name: 'Email',
    icon: '📧',
    color: '#94A3B8',
    buildUrl: (text: string, url: string) =>
      `mailto:?subject=${encodeURIComponent('Check out PlayNexa')}&body=${encodeURIComponent(text + '\n' + url)}`
  },
  {
    name: 'More',
    icon: '⋯',
    color: '#94A3B8',
    buildUrl: () => ''  // triggers navigator.share
  }
]

export default function ShareSheet({
  isOpen, onClose,
  title = 'PlayNexa',
  text  = '🎬 Check out PlayNexa — Stream movies, watch shorts & play games!',
  url   = typeof window !== 'undefined'
    ? window.location.origin : ''
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleApp = async (app: typeof SHARE_APPS[0]) => {
    if (app.name === 'More') {
      // Native share sheet
      try {
        await navigator.share({ title, text, url })
      } catch {}
      return
    }

    if (app.name === 'Instagram') {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }

    const shareUrl = app.buildUrl(text, url)
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }
    onClose()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        onClose()
      }, 1500)
    } catch {}
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-end">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="relative w-full bg-[#111827]
                      border-t border-[#1E293B]
                      rounded-t-3xl z-10 pb-8">

        {/* Handle */}
        <div className="w-10 h-1 bg-[#1E293B]
                        rounded-full mx-auto mt-3 mb-4" />

        {/* Header */}
        <div className="flex items-center
                        justify-between px-5 mb-4">
          <p className="text-white font-bold text-base">
            Share PlayNexa
          </p>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#1E293B]
                       active:scale-90
                       transition-transform duration-150"
          >
            <X size={16} className="text-[#94A3B8]" />
          </button>
        </div>

        {/* App Icons Row */}
        <div className="overflow-x-auto scrollbar-hide px-5">
          <div className="flex gap-4 pb-2">
            {SHARE_APPS.map(app => (
              <button
                key={app.name}
                onClick={() => handleApp(app)}
                className="flex flex-col items-center
                           gap-2 flex-shrink-0
                           active:scale-90
                           transition-transform duration-150"
              >
                <div
                  className="w-14 h-14 rounded-2xl
                             flex items-center
                             justify-center text-2xl"
                  style={{
                    backgroundColor: app.color + '25',
                    border: `1px solid ${app.color}40`
                  }}
                >
                  {app.icon}
                </div>
                <p className="text-[#94A3B8] text-[11px]">
                  {app.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 my-4
                        border-t border-[#1E293B]" />

        {/* Copy Link */}
        <div className="mx-5">
          <div className="flex items-center gap-3
                          bg-[#0F172A] border border-[#1E293B]
                          rounded-2xl p-3">
            <div className="flex-1 min-w-0">
              <p className="text-[#94A3B8] text-[10px]
                            uppercase tracking-wide mb-0.5">
                App Link
              </p>
              <p className="text-white text-sm truncate">
                {url}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2
                          px-4 py-2 rounded-xl text-xs
                          font-semibold flex-shrink-0
                          active:scale-95
                          transition-all duration-150
                          ${copied
                            ? 'bg-[#22C55E] text-white'
                            : 'bg-[#7C5CFF] text-white'
                          }`}
            >
              {copied
                ? <><Check size={14} /> Copied!</>
                : <><Copy size={14} /> Copy</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
