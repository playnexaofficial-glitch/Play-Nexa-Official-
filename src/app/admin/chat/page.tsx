// ── Play Nexa Admin — AI Chat Assistant ──────────────────────────
// Chat with Gemini AI about Play Nexa
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ──

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface GeminiKey {
  id: string
  key_name: string
  is_active: boolean
  status: string
}

// ── Quick Actions ──

const QUICK_ACTIONS = [
  {
    label: '📊 SQL Helper',
    msg: 'আমার সব Supabase টেবিল একটা SQL এ দাও',
  },
  {
    label: '🐛 Bug Fix',
    msg: 'আমার একটা bug আছে, fix prompt দাও',
  },
  {
    label: '📱 App Info',
    msg: 'Play Nexa app এর সব ফিচার বলো',
  },
  {
    label: '🔧 Code',
    msg: 'একটা component এর prompt দাও',
  },
]

// ── Component ──

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `আমি Play Nexa AI Assistant! 🤖

তোমার app সম্পর্কে সব জানি।
আমাকে জিজ্ঞেস করতে পারো:

📊 SQL Helper → "সব টেবিল একটা SQL এ দাও"
🐛 Bug Fixer → "এই error fix করো: ..."
📱 App Info → "কোন কোন ফিচার আছে?"
🔧 Code Generator → "Movie card component দাও"

কী সাহায্য লাগবে?`,
      id: '0',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')
  const [availableKeys, setAvailableKeys] = useState<GeminiKey[]>([])
  const [showKeySelector, setShowKeySelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionId = useRef(Date.now().toString()).current

  // ── Load keys via API route ──

  useEffect(() => {
    const loadKeys = async () => {
      try {
        const res = await fetch('/api/admin/gemini-keys')
        const data = await res.json()
        if (data.keys) {
          setAvailableKeys(data.keys)
          const active = data.keys.find((k: any) => k.is_active)
          if (active) setSelectedKeyId(active.id)
        }
      } catch {}
    }
    loadKeys()
  }, [])

  // ── Scroll to bottom ──

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ──

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-10),
          keyId: selectedKeyId || undefined,
          sessionId,
        }),
      })

      const data = await response.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Error getting response',
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '❌ Error. Check API key and try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, selectedKeyId, messages, sessionId])

  // ── Render ──

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#1A1A1A] flex-shrink-0">
        <h1 className="text-white font-bold text-sm">🤖 AI Assistant</h1>

        <button
          onClick={() => setShowKeySelector(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] rounded-full border border-[#2D2D2D] min-h-[36px] active:opacity-80 transition-opacity"
        >
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[#9CA3AF] text-xs max-w-[120px] truncate">
            {availableKeys.find((k) => k.id === selectedKeyId)?.key_name ||
              'Default Key'}
          </span>
          <span className="text-[#9CA3AF] text-xs">▾</span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0 border-b border-[#1A1A1A] scrollbar-hide">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => setInput(action.msg)}
            className="flex-shrink-0 px-3 py-2 bg-[#7C3AED]/20 border border-[#7C3AED]/30 rounded-full text-[#A78BFA] text-xs whitespace-nowrap min-h-[36px] active:opacity-80 transition-opacity"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#7C3AED] text-white rounded-br-sm'
                  : 'bg-[#1A1A1A] text-white rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#1A1A1A] rounded-2xl px-4 py-3 flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-[#7C3AED] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-[#1A1A1A] flex-shrink-0 flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="কিছু জিজ্ঞেস করো..."
          rows={1}
          className="flex-1 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-white text-sm outline-none resize-none placeholder-[#4B5563] focus:border-[#7C3AED] min-h-[44px] transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="w-12 h-12 bg-[#7C3AED] rounded-xl flex items-center justify-center disabled:opacity-40 active:opacity-80 flex-shrink-0 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>

      {/* Key Selector Modal */}
      {showKeySelector && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/70"
            onClick={() => setShowKeySelector(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0F0F0F] rounded-t-2xl p-6 pb-10 border-t border-[#1A1A1A]">
            <div className="w-10 h-1 bg-[#2D2D2D] rounded-full mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">Select Chat API Key</p>
            <p className="text-[#9CA3AF] text-xs mb-4">
              এই key শুধু chatbot এর জন্য। App এর other features এ কাজ করবে না।
            </p>
            {availableKeys.length === 0 ? (
              <p className="text-[#4B5563] text-sm py-4 text-center">
                No keys found. Add keys from API Keys page first.
              </p>
            ) : (
              availableKeys.map((key) => (
                <button
                  key={key.id}
                  onClick={() => {
                    setSelectedKeyId(key.id)
                    setShowKeySelector(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 min-h-[52px] rounded-xl mb-2 active:bg-[#1A1A1A] transition-colors border ${
                    selectedKeyId === key.id
                      ? 'border-[#7C3AED] bg-[#7C3AED]/10'
                      : 'border-transparent'
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      key.status === 'active' ? 'bg-green-400' : 'bg-[#4B5563]'
                    }`}
                  />
                  <span className="text-white text-sm flex-1 text-left">
                    {key.key_name}
                  </span>
                  <span className="text-[#9CA3AF] text-xs">
                    {key.status === 'active' ? 'Active' : key.status}
                  </span>
                </button>
              ))
            )}

            {/* Use default key option */}
            <button
              onClick={() => {
                setSelectedKeyId('')
                setShowKeySelector(false)
              }}
              className={`w-full flex items-center gap-3 px-4 min-h-[52px] rounded-xl active:bg-[#1A1A1A] transition-colors border ${
                selectedKeyId === ''
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10'
                  : 'border-transparent'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span className="text-white text-sm flex-1 text-left">
                Default (.env key)
              </span>
              <span className="text-[#9CA3AF] text-xs">System</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
