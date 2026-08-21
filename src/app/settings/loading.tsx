// ── Play Nexa — Settings Loading Skeleton ──

export default function SettingsLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-20 animate-pulse">
      {/* Header */}
      <div className="h-8 w-24 bg-[#1A1A2E] rounded mx-4 mt-4" />

      {/* Settings Sections */}
      {Array.from({ length: 4 }).map((_, s) => (
        <div key={s} className="px-4 mt-6">
          <div className="h-4 w-28 bg-[#1A1A2E] rounded mb-3" />
          <div className="bg-[#1A1A2E] rounded-2xl divide-y divide-[#2D2D2D]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between h-14 px-4">
                <div className="h-4 w-32 bg-[#12121C] rounded" />
                <div className="w-10 h-6 bg-[#12121C] rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
