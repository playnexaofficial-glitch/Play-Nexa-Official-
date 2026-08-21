// ── Play Nexa — Movie Hub Loading Skeleton ──
// Prevents blank screen while MovieHub loads data

export default function MoviesLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="w-full h-48 bg-[#1A1A2E] rounded-b-2xl" />

      {/* Category Chips */}
      <div className="flex gap-2 px-4 mt-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-[#1A1A2E] rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Movie Rows */}
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row} className="mt-6 px-4">
          <div className="h-5 w-28 bg-[#1A1A2E] rounded mb-3" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, col) => (
              <div key={col} className="flex-shrink-0 w-32">
                <div className="h-44 bg-[#1A1A2E] rounded-xl" />
                <div className="h-3 w-24 bg-[#1A1A2E] rounded mt-2" />
                <div className="h-3 w-16 bg-[#1A1A2E] rounded mt-1" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
