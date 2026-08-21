'use client';

export default function Equalizer() {
  const barDelays = [0, 0.1, 0.2, 0.3, 0.15, 0.25, 0.05];

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end gap-1 h-10" role="img" aria-label="Audio equalizer animation">
        {barDelays.map((delay, index) => (
          <div
            key={index}
            className="w-2 bg-pn-purple rounded-full animate-eq-bar"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-pn-muted text-xs">🎚️ Equalizer</span>
        <span className="inline-flex items-center bg-pn-secondary border border-pn-border text-pn-muted text-[10px] font-semibold rounded-full px-2 py-0.5">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
