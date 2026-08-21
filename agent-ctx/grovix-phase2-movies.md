# GROVIX Phase 2 — Movie Pages Upgrade

## Task ID: grovix-phase2-movies

## Summary
Upgraded 3 movie-related pages and supporting components for GROVIX Phase 2 with the new AI Discovery system, dubbed version switching, and smart search.

## Files Created/Modified

### Created
- `/home/z/my-project/src/app/search/page.tsx` — Smart Search page with 4 filter rows (Genre, Language, Access, Platform), debounced search, recent/popular searches, 2-column grid results

### Upgraded
- `/home/z/my-project/src/app/movies/page.tsx` — Movie Hub with AI Discovery sections (Trending in Bangladesh, Anime Universe, Popular Hindi Dubbed, Sci-Fi Collection, Viral This Week, Recommended For You), MovieSection component, search navigation
- `/home/z/my-project/src/app/movies/[id]/page.tsx` — Movie Detail with YouTube iframe (playsinline), dubbed version switching (tap chips to change videoId), channel info section with avatar/verification badge, description expand/collapse
- `/home/z/my-project/src/components/movies/MovieCard.tsx` — Added `fullWidth` prop for 2-column grid layout in search
- `/home/z/my-project/src/components/movies/RelatedMovies.tsx` — Added `dubbed` prop support
- `/home/z/my-project/src/data/movies.json` — Added `platform: "YouTube"` field to all 25 movies

## GROVIX Color System Used
- bg-grovix-bg (#070B14), bg-grovix-card (#111827), border-grovix-border (#1E293B)
- text-grovix-purple (#7C5CFF), text-grovix-cyan (#00D4FF), text-grovix-muted (#94A3B8)
- bg-grovix-secondary (#0F172A), bg-grovix-success (#22C55E)

## Key Design Decisions
- No Framer Motion — CSS transitions max 300ms
- Touch targets min 44px throughout
- pb-24 on all pages for bottom nav clearance
- Dubbed version switching uses derived state pattern (no setState in effects)
- Recent searches stored in localStorage key `grovix_recent_searches`
- Search debounce at 300ms
- Lint passes clean with no errors
