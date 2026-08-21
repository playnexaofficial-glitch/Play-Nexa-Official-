'use client';

interface CategoryFilterProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({
  categories,
  active,
  onChange,
}: CategoryFilterProps) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2"
      aria-label="Movie categories"
    >
      {categories.map((category) => {
        const isActive = category === active;
        return (
          <button
            key={category}
            onClick={() => onChange(category)}
            className={`rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 min-h-[44px] min-w-[44px] transition-colors duration-150 ${
              isActive
                ? 'bg-pn-purple text-white'
                : 'bg-pn-card text-pn-muted border border-pn-border hover:text-white hover:border-pn-purple/50'
            }`}
            aria-pressed={isActive}
            aria-label={`Filter by ${category}`}
          >
            {category}
          </button>
        );
      })}
    </nav>
  );
}
