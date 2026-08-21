'use client';

export default function LyricsPanel() {
  return (
    <section
      className="bg-pn-secondary rounded-2xl p-4"
      aria-label="Song lyrics"
    >
      <h3 className="text-white font-semibold text-sm mb-2">Lyrics</h3>
      <div className="max-h-48 overflow-y-auto scrollbar-thin">
        <p className="text-pn-muted text-sm italic">
          Lyrics coming soon
        </p>
      </div>
    </section>
  );
}
