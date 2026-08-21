'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, RefreshCw, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface FeedbackItem {
  id: string
  user_id: string | null
  category: string
  description: string
  ai_verified: boolean
  is_duplicate: boolean
  duplicate_of: string | null
  priority: 'high' | 'medium' | 'low'
  ai_summary: string
  status: 'open' | 'in_progress' | 'resolved'
  same_issue_count: number
  created_at: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  Movie: '🎬',
  Music: '🎵',
  Game: '🎮',
  App: '📱',
  Bug: '🐛',
  Idea: '💡',
}

const PRIORITY_BADGES: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-red-950/40 border-red-800/50', text: 'text-red-400' },
  medium: { bg: 'bg-yellow-950/40 border-yellow-800/50', text: 'text-yellow-400' },
  low: { bg: 'bg-green-950/40 border-green-800/50', text: 'text-green-400' },
}

export default function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showFixModal, setShowFixModal] = useState(false)
  const [fixPrompt, setFixPrompt] = useState('')
  const [fixLoading, setFixLoading] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/feedback')
      const data = await res.json()
      if (data.error) {
        showToast('❌ ' + data.error)
      } else {
        setFeedbacks(data.feedback || [])
      }
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to load feedback'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`✅ Status updated to ${status}`)
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: status as any } : f))
        )
      } else {
        showToast('❌ ' + (data.error || 'Update failed'))
      }
    } catch {
      showToast('❌ Network error')
    }
  }

  const getFixPrompt = async (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback)
    setFixLoading(true)
    setShowFixModal(true)

    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Please generate a clear engineering solution and fix prompt for this issue:
Category: ${feedback.category}
Issue: ${feedback.description}
AI Summary: ${feedback.ai_summary || 'N/A'}`,
          history: [],
        }),
      })
      const data = await res.json()
      setFixPrompt(data.reply || 'No response from AI')
    } catch {
      setFixPrompt('❌ Failed to get AI prompt')
    } finally {
      setFixLoading(false)
    }
  }

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (filterPriority !== 'all' && fb.priority !== filterPriority) return false
    if (filterStatus !== 'all' && fb.status !== filterStatus) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Feedback Center</h1>
            <p className="text-xs text-[#9CA3AF]">
              {feedbacks.length} user submissions • AI issue categorization
            </p>
          </div>
        </div>

        <button
          onClick={fetchFeedbacks}
          className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] hover:bg-[#1A1A2E] flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] ${
            filterStatus === 'all'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#141420] text-[#9CA3AF] border border-[#2D2D44]'
          }`}
        >
          All Status
        </button>
        <button
          onClick={() => setFilterStatus('open')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] ${
            filterStatus === 'open'
              ? 'bg-blue-600 text-white'
              : 'bg-[#141420] text-[#9CA3AF] border border-[#2D2D44]'
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setFilterStatus('in_progress')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] ${
            filterStatus === 'in_progress'
              ? 'bg-yellow-600 text-white'
              : 'bg-[#141420] text-[#9CA3AF] border border-[#2D2D44]'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] ${
            filterStatus === 'resolved'
              ? 'bg-green-600 text-white'
              : 'bg-[#141420] text-[#9CA3AF] border border-[#2D2D44]'
          }`}
        >
          Resolved
        </button>
      </div>

      {isLoading && feedbacks.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="text-center py-16 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl">
          <p className="text-[#6B7280] text-sm">No feedback matching current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_EMOJI[fb.category] || '💬'}</span>
                  <span className="text-white text-sm font-semibold">{fb.category || 'General'}</span>
                  {fb.priority && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        PRIORITY_BADGES[fb.priority]?.bg || 'bg-[#141420]'
                      } ${PRIORITY_BADGES[fb.priority]?.text || 'text-white'}`}
                    >
                      {fb.priority.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9CA3AF]">
                    {new Date(fb.created_at).toLocaleDateString()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      fb.status === 'resolved'
                        ? 'bg-green-950/40 text-green-400 border border-green-800/40'
                        : fb.status === 'in_progress'
                        ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/40'
                        : 'bg-blue-950/40 text-blue-400 border border-blue-800/40'
                    }`}
                  >
                    {fb.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <p className="text-white text-xs leading-relaxed">{fb.description}</p>

              {fb.ai_summary && (
                <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-xl p-2.5 text-xs text-[#A78BFA]">
                  ✨ <strong className="text-white">AI Summary:</strong> {fb.ai_summary}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#1A1A2E] gap-2 flex-wrap">
                <button
                  onClick={() => getFixPrompt(fb)}
                  className="px-3 py-1.5 bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 text-[#A78BFA] rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px]"
                >
                  <Sparkles size={13} />
                  AI Fix Prompt
                </button>

                <div className="flex gap-2">
                  {fb.status !== 'in_progress' && fb.status !== 'resolved' && (
                    <button
                      onClick={() => updateStatus(fb.id, 'in_progress')}
                      className="px-3 py-1.5 bg-[#141420] border border-[#2D2D44] text-[#9CA3AF] hover:text-white rounded-lg text-xs font-semibold min-h-[36px]"
                    >
                      In Progress
                    </button>
                  )}
                  {fb.status !== 'resolved' && (
                    <button
                      onClick={() => updateStatus(fb.id, 'resolved')}
                      className="px-3 py-1.5 bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600/30 rounded-lg text-xs font-semibold min-h-[36px]"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Fix Prompt Modal */}
      {showFixModal && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/70"
            onClick={() => setShowFixModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-[#0F0F1A] border border-[#2D2D44] rounded-2xl p-6 max-w-lg w-[90%] max-h-[85vh] overflow-y-auto shadow-2xl">
            <h3 className="text-white font-bold text-base mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-[#7C3AED]" />
              AI Prompt & Solution
            </h3>

            {fixLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-[#141420] border border-[#2D2D44] rounded-xl text-xs text-white whitespace-pre-wrap leading-relaxed">
                  {fixPrompt}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFixModal(false)}
                    className="flex-1 h-11 bg-[#141420] border border-[#2D2D44] text-[#9CA3AF] rounded-xl text-xs font-semibold"
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(fixPrompt)
                      showToast('📋 Copied to clipboard')
                    }}
                    className="flex-1 h-11 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-semibold"
                  >
                    Copy Output
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 py-3 z-[70] max-w-sm mx-auto shadow-lg">
          <p className="text-white text-sm text-center">{toast}</p>
        </div>
      )}
    </div>
  )
}
