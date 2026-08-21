// ── Play Nexa — Profile Loading Skeleton ──

export default function ProfileLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Avatar + Name */}
      <div className="flex flex-col items-center mt-8">
        <div className="w-20 h-20 bg-[#1A1A2E] rounded-full" />
        <div className="h-5 w-28 bg-[#1A1A2E] rounded mt-4" />
        <div className="h-3 w-20 bg-[#1A1A2E] rounded mt-2" />
      </div>

      {/* Stats Row */}
      <div className="flex justify-center gap-8 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-6 w-10 bg-[#1A1A2E] rounded" />
            <div className="h-3 w-14 bg-[#1A1A2E] rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-8 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 h-14 bg-[#1A1A2E] rounded-xl px-4">
            <div className="w-8 h-8 bg-[#12121C] rounded-lg" />
            <div className="flex-1 h-4 bg-[#12121C] rounded" />
            <div className="w-4 h-4 bg-[#12121C] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
