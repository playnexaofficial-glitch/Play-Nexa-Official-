'use client'
interface Mood { id: string; label: string }
interface Props {
  moods: Mood[]; selected: string
  onChange: (id: string) => void
}
export default function MoodChips({
  moods, selected, onChange
}: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto
      hide-scroll px-4 py-3">
      {moods.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex-shrink-0 px-4 py-2
            rounded-full text-sm font-medium
            min-h-[36px] transition-colors
            duration-150
            ${selected === m.id
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#1A1A2E] text-[#9CA3AF]' }`}>
          {m.label}
        </button>
      ))}
    </div>
  )
}
