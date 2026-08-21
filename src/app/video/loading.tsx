// ── Play Nexa — Video Loading Skeleton ──

export default function VideoLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Header */}
      <div className="h-8 w-28 bg-[#1A1A2E] rounded mx-4 mt-4" />

      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-video bg-[#1A1A2E] rounded-xl" />
            <div className="h-3 w-24 bg-[#1A1A2E] rounded mt-2" />
            <div className="h-3 w-14 bg-[#1A1A2E] rounded mt-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
