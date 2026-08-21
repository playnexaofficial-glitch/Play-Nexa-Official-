// ── Play Nexa — Music Loading Skeleton ──

export default function MusicLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Header */}
      <div className="h-8 w-28 bg-[#1A1A2E] rounded mx-4 mt-4" />

      {/* Now Playing Bar */}
      <div className="mx-4 mt-4 h-20 bg-[#1A1A2E] rounded-2xl" />

      {/* Track List */}
      <div className="px-4 mt-5 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1A1A2E] rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-36 bg-[#1A1A2E] rounded" />
              <div className="h-3 w-24 bg-[#1A1A2E] rounded mt-2" />
            </div>
            <div className="h-3 w-8 bg-[#1A1A2E] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
