// ── Play Nexa — Local Media Loading Skeleton ──

export default function LocalLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Tab Bar */}
      <div className="flex gap-2 px-4 mt-4">
        <div className="h-10 w-20 bg-[#1A1A2E] rounded-xl" />
        <div className="h-10 w-20 bg-[#1A1A2E] rounded-xl" />
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-square bg-[#1A1A2E] rounded-xl" />
            <div className="h-3 w-24 bg-[#1A1A2E] rounded mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
