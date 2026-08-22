'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface Channel {
  id: string
  channel_url: string
  channel_id: string
  channel_name: string
  channel_avatar: string | null
  channel_type: 'movies' | 'music' | 'mixed'
  is_active: boolean
}

interface ScanState {
  status: string
  totalOnChannel: number
  imported: number
  movieCount: number
  musicCount: number
  remaining: number
  progress: number
  batchNumber: number
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [scanStates, setScanStates] = useState<Record<string, ScanState>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [channelType, setChannelType] = useState<'movies' | 'music' | 'mixed'>('movies')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchedInfo, setFetchedInfo] = useState<any>(null)
  const [fetchError, setFetchError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState('')
  const pollRefs = useRef<Record<string, NodeJS.Timeout>>({})
  const [fullImportStates, setFullImportStates] = useState<Record<string, any>>({})
  const fullImportPollRefs = useRef<Record<string, NodeJS.Timeout>>({})

  // Quick Add states
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickUrl, setQuickUrl] = useState('')
  const [quickPreview, setQuickPreview] = useState<any>(null)
  const [quickCategory, setQuickCategory] = useState<'movie' | 'music'>('movie')
  const [quickFetching, setQuickFetching] = useState(false)
  const [quickLoading, setQuickLoading] = useState(false)

  // Channel Browser states
  const [showBrowser, setShowBrowser] = useState(false)
  const [browserUrl, setBrowserUrl] = useState('')
  const [browserData, setBrowserData] = useState<any>(null)
  const [browserLoading, setBrowserLoading] = useState(false)
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [browserCategory, setBrowserCategory] = useState<'movie' | 'music'>('movie')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [browserSearch, setBrowserSearch] = useState('')

  // Filter videos client-side
  const filteredBrowserVideos = browserSearch.trim()
    ? browserData?.videos?.filter((v: any) =>
        v.title.toLowerCase().includes(browserSearch.toLowerCase())
      )
    : browserData?.videos

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const startPolling = useCallback((chId: string) => {
    if (pollRefs.current[chId]) return
    pollRefs.current[chId] = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/scan-status?channelId=${chId}`)
        const data = await res.json()
        setScanStates((prev) => ({ ...prev, [chId]: data }))
        if (data.status === 'scanning') {
          await fetch('/api/admin/auto-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelDbId: chId,
              action: 'resume',
            }),
          })
        }
        if (data.status !== 'scanning') {
          clearInterval(pollRefs.current[chId])
          delete pollRefs.current[chId]
        }
      } catch {}
    }, 8000)
  }, [])

  const loadScanStatus = useCallback(
    async (chId: string) => {
      try {
        const res = await fetch(`/api/admin/scan-status?channelId=${chId}`)
        const data = await res.json()
        setScanStates((prev) => ({ ...prev, [chId]: data }))
        if (data.status === 'scanning') {
          startPolling(chId)
        }
      } catch {}
    },
    [startPolling]
  )

  const loadChannels = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/channels')
      const data = await res.json()
      const list = data.channels || []
      setChannels(list)
      setLoading(false)
      for (const ch of list) {
        await loadScanStatus(ch.id)
      }
    } catch {
      setLoading(false)
    }
  }, [loadScanStatus])

  useEffect(() => {
    loadChannels()
    const activePolls = pollRefs.current
    const activeFIPolls = fullImportPollRefs.current
    return () => {
      Object.values(activePolls).forEach(clearInterval)
      Object.values(activeFIPolls).forEach(clearInterval)
    }
  }, [loadChannels])

  const handleFullImport = async (channelId: string) => {
    const res = await fetch('/api/admin/full-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelDbId: channelId,
      }),
    })
    const data = await res.json()
    if (data.error) {
      showToast('❌ ' + data.error)
      return
    }
    showToast('🚀 Full import started!')
    startFullImportPolling(channelId)
  }

  const startFullImportPolling = (channelId: string) => {
    if (fullImportPollRefs.current[channelId]) return
    fullImportPollRefs.current[channelId] = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/admin/full-import-status?channelId=${channelId}`
        )
        const data = await res.json()
        setFullImportStates((prev) => ({
          ...prev,
          [channelId]: data,
        }))
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(fullImportPollRefs.current[channelId])
          delete fullImportPollRefs.current[channelId]
          if (data.status === 'completed') {
            showToast(
              `✅ Import done! 🎬 ${data.moviesAdded || 0} movies + 🎵 ${data.musicAdded || 0} music`
            )
            loadChannels()
          }
        }
      } catch (err) {
        console.error('FID poll error', err)
      }
    }, 3000)
  }

  const handleFetch = async () => {
    if (!urlInput.trim()) return
    setIsFetching(true)
    setFetchError('')
    setFetchedInfo(null)
    let cleanId = urlInput.trim()
    try {
      const u = new URL(cleanId)
      cleanId = u.origin + u.pathname
    } catch {
      cleanId = cleanId.split('?')[0]
    }
    try {
      const res = await fetch(
        `/api/admin/channel-info?id=` + encodeURIComponent(cleanId)
      )
      const data = await res.json()
      if (data.error) {
        setFetchError(data.error)
      } else {
        setFetchedInfo(data)
      }
    } catch {
      setFetchError('Failed to connect. Please check the URL.')
    } finally {
      setIsFetching(false)
    }
  }

  const handleSaveAndScan = async () => {
    if (!fetchedInfo?.channelId) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_url: urlInput.trim(),
          channel_id: fetchedInfo.channelId,
          channel_name: fetchedInfo.name,
          channel_avatar: fetchedInfo.avatar,
          channel_type: channelType,
        }),
      })
      const data = await res.json()
      if (data.error) {
        showToast('❌ ' + data.error)
        setIsSaving(false)
        return
      }
      await fetch('/api/admin/auto-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelDbId: data.channel.id,
          action: 'start',
        }),
      })
      setShowAddModal(false)
      setUrlInput('')
      setFetchedInfo(null)
      setIsSaving(false)
      showToast('✅ Channel saved! Scanning...')
      await loadChannels()
      setTimeout(() => startPolling(data.channel.id), 2000)
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Error saving channel'))
      setIsSaving(false)
    }
  }

  const handleScanAction = async (
    chId: string,
    action: 'start' | 'pause' | 'resume' | 'stop'
  ) => {
    await fetch('/api/admin/auto-scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelDbId: chId, action }),
    })
    setScanStates((prev) => ({
      ...prev,
      [chId]: {
        ...prev[chId],
        status:
          action === 'stop'
            ? 'idle'
            : action === 'pause'
            ? 'paused'
            : 'scanning',
      },
    }))
    if (action === 'start' || action === 'resume') {
      startPolling(chId)
    } else {
      if (pollRefs.current[chId]) {
        clearInterval(pollRefs.current[chId])
        delete pollRefs.current[chId]
      }
    }
  }

  const handleDeleteChannel = async (chId: string) => {
    if (!confirm('Delete this channel and all its imported content?')) return
    await fetch('/api/admin/channels', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: chId }),
    })
    setChannels((prev) => prev.filter((ch) => ch.id !== chId))
    showToast('✅ Channel deleted')
  }

  // Quick Add handlers
  const handleQuickFetch = async () => {
    if (!quickUrl.trim()) return
    setQuickFetching(true)
    setQuickPreview(null)
    const clean = quickUrl.trim().split('?si=')[0]
    try {
      const res = await fetch('/api/admin/quick-add?preview=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: clean,
          category: 'auto',
        }),
      })
      const data = await res.json()
      if (data.error) showToast('❌ ' + data.error)
      else {
        setQuickPreview(data)
        setQuickCategory(data.aiSuggestion === 'music' ? 'music' : 'movie')
      }
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to fetch video'))
    }
    setQuickFetching(false)
  }

  const handleQuickAdd = async () => {
    if (!quickPreview) return
    setQuickLoading(true)
    try {
      const res = await fetch('/api/admin/quick-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: quickUrl.trim().split('?si=')[0],
          category: quickCategory,
        }),
      })
      const data = await res.json()
      if (data.error) showToast('❌ ' + data.error)
      else {
        showToast(`✅ "${data.title}" added!`)
        setShowQuickAdd(false)
        setQuickUrl('')
        setQuickPreview(null)
      }
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to add video'))
    }
    setQuickLoading(false)
  }

  // Channel Browser handlers
  const handleBrowserLoad = async () => {
    if (!browserUrl.trim()) return
    setBrowserLoading(true)
    setBrowserData(null)
    setSelectedVideos(new Set())
    setBrowserSearch('')
    try {
      const res = await fetch('/api/admin/channel-browse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelUrl: browserUrl.trim(),
        }),
      })
      const data = await res.json()
      if (data.error) showToast('❌ ' + data.error)
      else setBrowserData(data)
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to load channel'))
    }
    setBrowserLoading(false)
  }

  const handleBulkImport = async () => {
    if (!browserData || selectedVideos.size === 0) return
    setImporting(true)
    const toImport = browserData.videos.filter(
      (v: any) => selectedVideos.has(v.videoId) && !v.isImported
    )
    setImportProgress({ done: 0, total: toImport.length })
    let success = 0
    for (let i = 0; i < toImport.length; i++) {
      const v = toImport[i]
      try {
        const res = await fetch('/api/admin/quick-add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: `https://youtube.com/watch?v=` + v.videoId,
            category: browserCategory,
            prefilled: {
              videoId: v.videoId,
              title: v.title,
              thumbnail: v.thumbnail,
              channelName: browserData.channelName,
              channelId: browserData.channelId,
            },
          }),
        })
        const data = await res.json()
        if (data.success) success++
      } catch {}
      setImportProgress({ done: i + 1, total: toImport.length })
    }
    setImporting(false)
    showToast(`✅ Imported ${success} items`)
    setShowBrowser(false)
    setBrowserData(null)
    setBrowserUrl('')
    setSelectedVideos(new Set())
    setBrowserSearch('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white">Channels</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBrowser(true)}
            className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] active:opacity-80 hover:bg-[#1A1A2E] transition-colors"
          >
            🔍 Browse
          </button>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] active:opacity-80 hover:bg-[#1A1A2E] transition-colors"
          >
            ⚡ Quick Add
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-xs font-semibold min-h-[44px] active:opacity-80 transition-colors"
          >
            + Channel
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: '#1A1A2E',
        border: '1px solid #2D2D44',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 16,
        fontSize: 12,
        color: '#9CA3AF',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1.8,
      }}>
        <strong style={{ color: '#FFFFFF' }}>Channel Stats Guide:</strong><br/>
        On Channel = Total videos on the YouTube channel<br/>
        Imported = Videos imported into Play Nexa<br/>
        Remaining = Videos not yet imported (On Channel - Imported)
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-16 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl">
          <p className="text-[#6B7280] text-sm">
            No channels yet. Add your first YouTube channel to import movies & music.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((ch) => {
            const scan = scanStates[ch.id]
            const fi = fullImportStates[ch.id]
            const isFullImporting =
              fi?.status === 'fetching_videos' ||
              fi?.status === 'classifying' ||
              fi?.status === 'importing'
            return (
              <div
                key={ch.id}
                className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 transition-all duration-150"
              >
                <div className="flex items-center gap-3 mb-4">
                  {ch.channel_avatar ? (
                    <img
                      src={ch.channel_avatar}
                      className="w-12 h-12 rounded-full object-cover bg-[#141420]"
                      alt={ch.channel_name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#A78BFA] font-bold text-lg">
                      {ch.channel_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {ch.channel_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          ch.channel_type === 'movies'
                            ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
                            : ch.channel_type === 'music'
                            ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-800/30'
                            : 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
                        }`}
                      >
                        {ch.channel_type}
                      </span>
                      <span
                        className={`text-xs ${
                          scan?.status === 'scanning'
                            ? 'text-green-400 animate-pulse'
                            : scan?.status === 'completed'
                            ? 'text-[#7C3AED]'
                            : scan?.status === 'paused'
                            ? 'text-yellow-400'
                            : 'text-[#6B7280]'
                        }`}
                      >
                        ● {scan?.status || 'idle'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    {
                      label: 'On Channel',
                      value: scan?.totalOnChannel > 0
                        ? scan.totalOnChannel
                        : scan?.totalOnChannel === 0
                          ? '0'
                          : '?'
                    },
                    { label: 'Imported', value: scan?.imported || 0 },
                    { label: 'Remaining', value: scan?.remaining || 0 },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-[#141420] rounded-xl p-2.5 text-center"
                    >
                      <p className="text-white font-bold text-lg">{s.value}</p>
                      <p className="text-[#9CA3AF] text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>

                {(scan?.progress || 0) > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-[#9CA3AF] mb-1">
                      <span>Progress</span>
                      <span>{scan?.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A1A2E] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7C3AED] transition-all duration-300"
                        style={{
                          width: `${scan?.progress || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {scan?.status === 'completed' && scan?.totalOnChannel === 0 && (
                  <div className="mb-3 p-3 bg-yellow-950/20 border border-yellow-800/30 rounded-xl text-yellow-500 text-xs leading-relaxed">
                    Channel added but 0 videos found via RSS. This may be a private channel or YouTube is temporarily blocking RSS access. Try using Quick Add to add specific video URLs.
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {(!scan?.status ||
                    scan.status === 'idle' ||
                    scan.status === 'completed') && (
                    <button
                      onClick={() => handleFullImport(ch.id)}
                      disabled={isFullImporting}
                      className="w-full py-3 bg-green-700 hover:bg-green-600 rounded-xl text-white text-sm font-bold min-h-[48px] disabled:opacity-60 active:opacity-80 flex items-center justify-center gap-2"
                    >
                      {isFullImporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {fi.status === 'fetching_videos'
                            ? `Fetching videos... (${fi.total})`
                            : fi.status === 'classifying'
                            ? `Classifying ${fi.total} videos...`
                            : `Importing ${fi.processed}/${fi.total}...`}
                        </>
                      ) : (
                        '🚀 Full Import (All Videos)'
                      )}
                    </button>
                  )}
                  {scan?.status === 'scanning' && (
                    <button
                      onClick={() => handleScanAction(ch.id, 'pause')}
                      className="flex-1 py-2.5 bg-yellow-700 hover:bg-yellow-600 rounded-xl text-white text-xs font-semibold min-h-[44px] active:opacity-80 transition-colors"
                    >
                      ⏸ Pause
                    </button>
                  )}
                  {scan?.status === 'paused' && (
                    <button
                      onClick={() => handleScanAction(ch.id, 'resume')}
                      className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl text-white text-xs font-semibold min-h-[44px] active:opacity-80 transition-colors"
                    >
                      ▶ Resume
                    </button>
                  )}
                  {(scan?.status === 'scanning' ||
                    scan?.status === 'paused') && (
                    <button
                      onClick={() => handleScanAction(ch.id, 'stop')}
                      className="px-4 py-2.5 bg-red-900/30 border border-red-800/50 hover:bg-red-900/50 rounded-xl text-red-400 text-xs min-h-[44px] active:opacity-80 transition-colors"
                    >
                      ⏹ Stop
                    </button>
                  )}
                  {scan?.status !== 'scanning' && !isFullImporting && (
                    <button
                      onClick={() => handleDeleteChannel(ch.id)}
                      className="w-full py-2.5 bg-red-950/40 border border-red-800/40 hover:bg-red-600 hover:text-white rounded-xl text-red-400 text-xs font-semibold min-h-[44px] active:opacity-80 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>

                {/* Full Import Progress */}
                {fi && isFullImporting && (
                  <div className="mt-3 space-y-2">
                    <div className="h-2 bg-[#1A1A2E] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: fi.total > 0
                            ? `${Math.round((fi.processed / fi.total) * 100)}%`
                            : '5%'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#9CA3AF]">
                      <span>🎬 {fi.moviesAdded || 0} movies</span>
                      <span>🎵 {fi.musicAdded || 0} music</span>
                      <span>⏭ {fi.skipped || 0} skipped</span>
                    </div>
                  </div>
                )}

                {fi?.status === 'completed' && (
                  <div className="mt-2 p-3 bg-green-900/20 border border-green-700/30 rounded-xl">
                    <p className="text-green-400 text-sm font-semibold">
                      ✅ Import Complete!
                    </p>
                    <p className="text-[#9CA3AF] text-xs mt-1">
                      🎬 {fi.moviesAdded || 0} movies •
                      🎵 {fi.musicAdded || 0} music •
                      ⏭ {fi.skipped || 0} skipped •
                      📋 {fi.duplicates || 0} duplicates
                    </p>
                  </div>
                )}

                {fi?.status === 'error' && (
                  <div className="mt-2 p-3 bg-red-900/20 border border-red-700/30 rounded-xl">
                    <p className="text-red-400 text-xs">
                      ❌ {fi.error}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add YouTube Channel Modal */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/70"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[56] bg-[#0F0F1A] rounded-t-3xl p-6 pb-10 border-t border-[#1A1A2E] max-w-lg mx-auto">
            <div className="w-10 h-1 bg-[#2D2D44] rounded-full mx-auto mb-5" />
            <p className="text-white font-bold text-lg mb-5">
              Add YouTube Channel
            </p>
            <div className="mb-4">
              <label className="text-[#9CA3AF] text-xs mb-2 block">
                YouTube Channel URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  className="flex-1 h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
                />
                <button
                  onClick={handleFetch}
                  disabled={isFetching || !urlInput.trim()}
                  className="px-4 h-12 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-sm font-semibold disabled:opacity-40 active:opacity-80 flex-shrink-0 flex items-center gap-2 min-h-[44px] transition-colors"
                >
                  {isFetching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Fetch'
                  )}
                </button>
              </div>
              {fetchError && (
                <p className="text-red-400 text-xs mt-2">{fetchError}</p>
              )}
            </div>

            {fetchedInfo && (
              <div className="flex items-center gap-3 bg-[#141420] rounded-xl p-3 mb-4">
                {fetchedInfo.avatar && (
                  <img
                    src={fetchedInfo.avatar}
                    className="w-12 h-12 rounded-full object-cover"
                    alt="avatar"
                    loading="lazy"
                  />
                )}
                <div>
                  <p className="text-white text-sm font-semibold">
                    {fetchedInfo.name}
                  </p>
                  <p className="text-[#9CA3AF] text-xs">
                    {fetchedInfo.videoCount} videos found
                  </p>
                </div>
              </div>
            )}

            <div className="mb-5">
              <label className="text-[#9CA3AF] text-xs mb-2 block">
                Channel Type
              </label>
              <div className="flex gap-2">
                {(['movies', 'music', 'mixed'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChannelType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] capitalize transition-colors ${
                      channelType === t
                        ? 'bg-[#7C3AED] text-white font-semibold'
                        : 'bg-[#141420] text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {t === 'movies' ? '🎬' : t === 'music' ? '🎵' : '🎭'} {t}
                  </button>
                ))}
              </div>
              <p className="text-[#6B7280] text-xs mt-2">
                {channelType === 'movies'
                  ? 'Movies → Movie Hub'
                  : channelType === 'music'
                  ? 'Music → YT Music'
                  : 'Both → Movie Hub + YT Music'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-12 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-sm active:opacity-80 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndScan}
                disabled={!fetchedInfo || isSaving}
                className="flex-1 h-12 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-sm font-semibold disabled:opacity-40 active:opacity-80 min-h-[44px] transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save & Scan with AI'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick Add Video Bottom Sheet */}
      {showQuickAdd && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/70"
            onClick={() => !quickLoading && setShowQuickAdd(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[56] bg-[#0F0F1A] rounded-t-3xl p-6 pb-10 border-t border-[#1A1A2E] max-w-lg mx-auto">
            <div className="w-10 h-1 bg-[#2D2D44] rounded-full mx-auto mb-5" />
            <p className="text-white font-bold text-lg mb-1">⚡ Quick Add Video</p>
            <p className="text-[#9CA3AF] text-xs mb-5">
              Any YouTube video URL → AI auto-classifies + imports instantly
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="url"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickFetch()}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
              />
              <button
                onClick={handleQuickFetch}
                disabled={quickFetching || !quickUrl.trim()}
                className="px-4 h-12 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-sm font-semibold disabled:opacity-40 active:opacity-80 flex-shrink-0 transition-colors"
              >
                {quickFetching ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-2" />
                ) : (
                  'Fetch'
                )}
              </button>
            </div>

            {quickPreview && (
              <>
                <div className="flex gap-3 bg-[#141420] rounded-xl p-3 mb-4">
                  <img
                    src={quickPreview.thumbnail}
                    className="w-24 h-14 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                    alt={quickPreview.title}
                  />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-2">
                      {quickPreview.title}
                    </p>
                    <p className="text-[#9CA3AF] text-xs mt-1">
                      {quickPreview.channelName}
                    </p>
                    <p className="text-[#7C3AED] text-xs mt-0.5">
                      🤖 AI: {quickPreview.aiSuggestion === 'music' ? '🎵 Music' : '🎬 Movie'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  {(['movie', 'music'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setQuickCategory(t)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium min-h-[52px] transition-colors ${
                        quickCategory === t
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-[#141420] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {t === 'movie' ? '🎬 Movie Hub' : '🎵 YT Music'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleQuickAdd}
                  disabled={quickLoading}
                  className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white font-semibold text-sm disabled:opacity-40 active:opacity-80 transition-colors"
                >
                  {quickLoading
                    ? 'Adding...'
                    : `Add as ${quickCategory === 'movie' ? '🎬 Movie' : '🎵 Music'}`}
                </button>
              </>
            )}

            <button
              onClick={() => setShowQuickAdd(false)}
              className="w-full h-10 text-[#9CA3AF] text-sm active:opacity-70 mt-2"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Channel Browser Modal (Full Screen Overlay) */}
      {showBrowser && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/80"
            onClick={() => {
              if (!importing) {
                setShowBrowser(false)
                setBrowserSearch('')
              }
            }}
          />
          <div className="fixed inset-x-0 top-[3%] bottom-0 z-[56] bg-[#0F0F1A] rounded-t-3xl flex flex-col border-t border-[#1A1A2E] max-w-4xl mx-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A2E] flex-shrink-0">
              <h2 className="text-white font-bold">🔍 Channel Browser</h2>
              {!importing && (
                <button
                  onClick={() => {
                    setShowBrowser(false)
                    setBrowserSearch('')
                  }}
                  className="text-[#9CA3AF] text-lg active:opacity-70 px-2 py-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="px-4 py-3 border-b border-[#1A1A2E] flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBrowserLoad()}
                  placeholder="youtube.com/@channel or youtube.com/channel/UC..."
                  className="flex-1 h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
                />
                <button
                  onClick={handleBrowserLoad}
                  disabled={browserLoading || !browserUrl.trim()}
                  className="px-4 h-12 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-sm font-semibold disabled:opacity-40 active:opacity-80 flex-shrink-0 flex items-center gap-2 transition-colors"
                >
                  {browserLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Load'
                  )}
                </button>
              </div>
            </div>

            {browserData && (
              <div className="px-4 py-3 border-b border-[#1A1A2E] flex-shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  {browserData.channelAvatar && (
                    <img
                      src={browserData.channelAvatar}
                      className="w-10 h-10 rounded-full object-cover"
                      loading="lazy"
                      alt={browserData.channelName}
                    />
                  )}
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {browserData.channelName}
                    </p>
                    <p className="text-[#9CA3AF] text-xs">
                      {browserData.videos?.length} videos loaded
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => {
                      const ids = new Set<string>(
                        browserData.videos
                          .filter((v: any) => !v.isImported)
                          .map((v: any) => v.videoId)
                      )
                      setSelectedVideos(ids)
                    }}
                    className="px-3 py-1.5 bg-[#7C3AED]/20 border border-[#7C3AED]/40 rounded-lg text-[#A78BFA] text-xs active:opacity-70 hover:bg-[#7C3AED]/30"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedVideos(new Set())}
                    className="px-3 py-1.5 bg-[#141420] border border-[#2D2D44] rounded-lg text-[#9CA3AF] text-xs active:opacity-70 hover:text-white"
                  >
                    Clear
                  </button>
                  <span className="text-[#9CA3AF] text-xs ml-auto flex items-center">
                    {selectedVideos.size} selected
                  </span>
                </div>
              </div>
            )}

            {browserData && (
              <div className="px-4 py-2 border-b border-[#1A1A2E] flex-shrink-0">
                <input
                  type="text"
                  value={browserSearch}
                  onChange={e => setBrowserSearch(e.target.value)}
                  placeholder="Search in channel videos..."
                  className="w-full h-10 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
                />
              </div>
            )}

            <div
              className="flex-1 overflow-y-auto px-4 py-2"
              style={{ contentVisibility: 'auto' }}
            >
              {filteredBrowserVideos?.map((v: any) => (
                <div
                  key={v.videoId}
                  className={`flex items-center gap-3 py-2 border-b border-[#141420] ${
                    !v.isImported ? 'cursor-pointer' : 'opacity-50'
                  }`}
                  onClick={() => {
                    if (v.isImported) return
                    setSelectedVideos((prev) => {
                      const n = new Set(prev)
                      if (n.has(v.videoId)) n.delete(v.videoId)
                      else n.add(v.videoId)
                      return n
                    })
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${
                      selectedVideos.has(v.videoId)
                        ? 'bg-[#7C3AED] border-[#7C3AED]'
                        : v.isImported
                        ? 'bg-green-800/30 border-green-700'
                        : 'border-[#4B5563]'
                    }`}
                  >
                    {(selectedVideos.has(v.videoId) || v.isImported) && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <img
                    src={v.thumbnail}
                    loading="lazy"
                    className="w-20 h-12 rounded-lg object-cover flex-shrink-0 bg-[#141420]"
                    alt={v.title}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium line-clamp-2">
                      {v.title}
                    </p>
                    <p className="text-[#6B7280] text-xs mt-0.5">
                      {v.isImported ? '✅ Already imported' : ''}
                    </p>
                  </div>
                </div>
              ))}
              {!browserData && !browserLoading && (
                <div className="flex items-center justify-center h-40">
                  <p className="text-[#6B7280] text-sm">
                    Enter a YouTube channel URL
                  </p>
                </div>
              )}
            </div>

            {browserData && selectedVideos.size > 0 && (
              <div className="px-4 py-4 border-t border-[#1A1A2E] flex-shrink-0">
                <div className="flex gap-2 mb-3">
                  {(['movie', 'music'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBrowserCategory(t)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
                        browserCategory === t
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-[#141420] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {t === 'movie' ? '🎬 Movie' : '🎵 Music'}
                    </button>
                  ))}
                </div>

                {importing && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-[#9CA3AF] mb-1">
                      <span>Importing...</span>
                      <span>
                        {importProgress.done}/{importProgress.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1A1A2E] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7C3AED] rounded-full transition-all duration-200"
                        style={{
                          width:
                            importProgress.total > 0
                              ? `${(importProgress.done / importProgress.total) * 100}%`
                              : '0%',
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBulkImport}
                  disabled={importing}
                  className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white font-semibold text-sm disabled:opacity-60 active:opacity-80 transition-colors"
                >
                  {importing
                    ? `Importing ${importProgress.done}/${importProgress.total}...`
                    : `Import ${selectedVideos.size} as ${
                        browserCategory === 'movie' ? '🎬 Movies' : '🎵 Music'
                      }`}
                </button>
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
