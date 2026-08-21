# GROVIX Media Ecosystem - Page Routes Task

## Task ID: grovix-pages

## Summary
Created 7 page routes for the GROVIX media ecosystem app, all using the GROVIX design system with dark theme (#070B14 background, #111827 cards, #7C5CFF purple accent, #00D4FF cyan accent).

## Files Created

### 1. `/src/app/games/page.tsx` — GAMES HUB
- TopBar with "Offline Games" title, back button, search
- GameCategories with chips: All, Racing, Arcade, Action, Zombie, Puzzle
- Featured game banner with thumbnail, rating, size, offline badge, Play Now button
- Category rows (Racing, Puzzle, Action, Arcade) with horizontal scrolling GameCards
- Filtered grid view when category is selected (not "All")

### 2. `/src/app/music/page.tsx` — MUSIC PLAYER
- TopBar with "Music Player" title, back button
- MusicPlayer component with album art, controls, progress
- Equalizer component
- LyricsPanel component
- "📋 Up Next" song list from music.json data
- Song selection updates the player, active song highlighted with purple border

### 3. `/src/app/player/page.tsx` — VIDEO PLAYER
- Full video player UI with aspect-video container
- Show/hide controls on tap with auto-hide timer
- Top: back arrow + video title + settings
- Center: skip back, play/pause, skip forward
- Bottom: progress scrubber, time display, speed selector, fullscreen
- "Coming Soon" feature badges: Subtitles, Floating Player, Gesture Control
- Playback speed selector with pill buttons
- Video info section

### 4. `/src/app/platforms/page.tsx` — PLATFORMS
- TopBar with "Streaming Platforms" title
- 2-column grid of PlatformCards
- ConfirmModal before opening any external URL

### 5. `/src/app/platforms/[id]/page.tsx` — PLATFORM DETAIL
- Dynamic route using useParams()
- PlatformHeader with platform data
- Collections section with colored dots and browse badges
- Open platform button with ConfirmModal
- EmptyState fallback when platform not found

### 6. `/src/app/profile/page.tsx` — PROFILE
- TopBar with settings link
- Avatar with gradient (purple → cyan), username, handle, edit profile button
- Stats row: 24 Downloads, 12 Saved, 8 Played
- Activity list with navigation links (Downloads, Watch History, Favorites, Playlists, Games)
- Quick settings: Dark Mode toggle, Notifications toggle, Help & Support, Rate GROVIX, Share App
- All toggles persist to localStorage

### 7. `/src/app/settings/page.tsx` — SETTINGS
- Appearance: 3 theme cards (Dark, AMOLED, Neon) with selection state
- Performance: Smooth Mode, Battery Saver, Lite Animation, Performance Boost toggles
- Network: Low Data Mode, Smart Loading toggles, Thumbnail Quality pill selector
- Security: Safe Redirect, External Warning, Secure Browser Mode toggles
- Storage: progress bar (1.2GB/4GB), breakdown, Clear Cache/Optimize Memory/Reset App buttons with ConfirmModal
- All settings connected to useSettings hook with localStorage persistence

## Supporting Changes

### Updated `/next.config.ts`
- Added `play-lh.googleusercontent.com` to images remotePatterns for game thumbnails

### Updated `/src/app/globals.css`
- Added `@keyframes spin-slow` and `.animate-spin-slow` for album art rotation
- Added `@keyframes eq-bar` and `.animate-eq-bar` for equalizer bar animation

### Fixed `/src/hooks/useSettings.ts`
- Replaced useEffect-based localStorage loading with lazy initializer pattern
- Fixes `react-hooks/set-state-in-effect` lint error

## Design Compliance
- ✅ Background: #070B14 (bg-grovix-bg)
- ✅ Card bg: #111827 (bg-grovix-card)
- ✅ Border: #1E293B (border-grovix-border)
- ✅ Secondary bg: #0F172A (bg-grovix-secondary)
- ✅ Primary accent: #7C5CFF (text-grovix-purple, bg-grovix-purple)
- ✅ Cyan accent: #00D4FF (text-grovix-cyan)
- ✅ Muted text: #94A3B8 (text-grovix-muted)
- ✅ Success: #22C55E (text-grovix-success)
- ✅ No Framer Motion - CSS transitions only (max 300ms)
- ✅ No backdrop-filter blur
- ✅ Touch targets min 44px
- ✅ All pages have pb-24 for BottomNav space
- ✅ All pages have min-h-screen

## Verification
- All 7 routes return HTTP 200
- ESLint passes with 0 errors
- All imports verified correct
