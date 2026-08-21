// ── Play Nexa — Download Loading Skeleton ──

export default function DownloadLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* URL Input */}
      <div className="mx-4 mt-4">
        <div className="h-14 bg-[#1A1A2E] rounded-2xl" />
      </div>

      {/* Platform Grid */}
      <div className="grid grid-cols-4 gap-3 px-4 mt-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-[#1A1A2E] rounded-2xl" />
            <div className="h-3 w-12 bg-[#1A1A2E] rounded" />
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="px-4 mt-8 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1A1A2E] rounded-full flex-shrink-0" />
            <div className="flex-1 h-4 bg-[#1A1A2E] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
