// ── Play Nexa — Search Loading Skeleton ──

export default function SearchLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Search Bar */}
      <div className="mx-4 mt-4">
        <div className="h-12 bg-[#1A1A2E] rounded-2xl" />
      </div>

      {/* Genre Filters */}
      <div className="flex gap-2 px-4 mt-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-[#1A1A2E] rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] bg-[#1A1A2E] rounded-xl" />
            <div className="h-3 w-20 bg-[#1A1A2E] rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
