// ── Play Nexa — Security Loading Skeleton ──

export default function SecurityLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Header */}
      <div className="h-8 w-32 bg-[#1A1A2E] rounded mx-4 mt-4" />

      {/* Security Cards */}
      <div className="px-4 mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 h-16 bg-[#1A1A2E] rounded-2xl px-4">
            <div className="w-10 h-10 bg-[#12121C] rounded-xl flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-28 bg-[#12121C] rounded" />
              <div className="h-3 w-40 bg-[#12121C] rounded mt-2" />
            </div>
            <div className="w-10 h-6 bg-[#12121C] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
