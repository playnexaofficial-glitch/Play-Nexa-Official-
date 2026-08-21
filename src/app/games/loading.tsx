// ── Play Nexa — Games Loading Skeleton ──

export default function GamesLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Header */}
      <div className="h-8 w-32 bg-[#1A1A2E] rounded mx-4 mt-4" />

      {/* Category Tabs */}
      <div className="flex gap-2 px-4 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-[#1A1A2E] rounded-xl" />
        ))}
      </div>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#1A1A2E] rounded-2xl p-4">
            <div className="h-28 bg-[#12121C] rounded-xl" />
            <div className="h-4 w-20 bg-[#12121C] rounded mt-3" />
            <div className="h-3 w-14 bg-[#12121C] rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
