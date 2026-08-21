# Play Nexa — Current App State
# Last updated: 2026-06-13
# DO NOT DELETE THIS FILE

## Stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS 4
- Capacitor (Android APK)
- Supabase (database + auth)
- Gemini AI (channel scanning)

## Bottom Navigation (5 tabs)
1. Home      → /
2. Game Hub  → /games
3. YT Music  → /ytmusic
4. Movies    → /movies
5. Me        → /profile

## Active Routes
```
/            → Home (6 feature cards, no API calls)
/music       → MusicLibrary (OFFLINE scanner)
/video       → VideoPlayer (OFFLINE scanner, re-exports /player)
/player      → VideoPlayer (OFFLINE scanner)
/movies      → MovieHub (Supabase data)
/games       → GameHub (4 types)
/ytmusic     → YT Music (Supabase data)
/profile     → Profile (Supabase auth)
/download    → Smart Download
/platforms   → Platforms Hub
/settings    → App Settings
/security    → Security Dashboard
/search      → Universal Search
/admin       → Admin Panel
/admin/login → Admin Login
/auth/callback → Auth Callback
```

## Redirected Routes (DEAD — redirect to /)
```
/shorts  → redirect('/')
/library → redirect('/')
```

## Features Built

### Music Library (offline)
- MusicLibrary.tsx — 5 tabs: All/Albums/Artists/Folders/Recently
- NowPlaying.tsx (vinyl disc animation)
- MiniPlayer.tsx (z-index:40)
- VinylDisc.tsx
- EqualizerBars.tsx
- useMusicPlayer.ts
- useMediaLibrary.ts
- NO video tabs or imports

### Video Player (offline)
- VideoLibrary.tsx — 3 tabs: All Videos/Folders/Recently Played
- VideoPlayer.tsx
- GestureOverlay.tsx
- PlayerControls.tsx
- useVideoPlayer.ts

### Movie Hub (online, Supabase)
- MovieHub.tsx — reads from Supabase `movies` table
- MovieCard.tsx — channel badge with colored style
- MovieModal.tsx — YouTube iframe player + Like/Save/Share/Comment
- Channel filter chips from `channel_display` table
- Infinite scroll (20 per page)
- Like/Save with Supabase + localStorage fallback
- NO download buttons

### Game Hub
- 4 types: offline/download/online/mini
- APK download (Capacitor)
- useGameDownload.ts

### YT Music (online, Supabase)
- MusicHub.tsx — reads from Supabase `music_tracks` table
- TrackCard.tsx — channel badge with logo
- MusicModal.tsx — YouTube iframe + Like/Save/Share/Comment
- Separate from offline Music Library
- Channel filter chips

### Admin Panel (/admin)
- /admin/login — Supabase auth + admin_users check + setup mode
- /admin — Dashboard with stats
- /admin/features — Feature on/off control
- /admin/movies — Movie CRUD
- /admin/users — User management
- /admin/games — Game CRUD
- /admin/channels — YT channel manager with Gemini AI scan
- /admin/notifications — Send notifications
- /admin/analytics — Charts
- /admin/settings — App settings

## Supabase Tables (25)
movies, music_tracks, user_likes,
user_watchlist, user_history,
music_likes, music_saved,
yt_channels, channel_display,
sync_logs, ai_scan_jobs,
games, game_downloads, game_scores,
game_data, user_profiles, admin_users,
admin_activity_log, app_features,
app_settings, notifications_log,
notification_log, push_subscriptions,
videos, missing_requests

## REMOVED Features (never bring back)
- Shorts tab in navigation
- Shorts route (/shorts) — now redirects to /
- Library route (/library) — now redirects to /
- YouTube Data API v3 on home page
- Hollywood trending section on home page
- Old 5-tab nav (Home/Movies/Shorts/Library/Profile)
- backdrop-blur anywhere
- Video tabs inside Music Library

## Design Tokens
```
Background:  #0D0D0D
Surface:     #1A1A2E
Accent:      #7C3AED
Cyan:        #06B6D4
Text:        #FFFFFF
Secondary:   #9CA3AF
Border:      #2D2D44
Card:        #1A1A2E
Input:       #1A1A1A with #2D2D2D border
Max transition: 200ms
Min touch target: 44px
No backdrop-blur
No styled-jsx
content-visibility: auto on scroll containers
```

## Tailwind Custom Colors
```
pn-bg:      #0D0D0D
pn-card:    #1A1A2E
pn-border:  #1E293B
pn-purple:  #7C3AED
pn-cyan:    #06B6D4
pn-muted:   #9CA3AF
pn-secondary: #1A1A2E
pn-success: #22C55E
```

## ENV Keys Required (.env)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
NEXT_PUBLIC_APP_URL
```

## Protected Files (NEVER modify)
- .env (contains all keys)
- useMusicPlayer.ts
- useMediaLibrary.ts
- MiniPlayer.tsx (music)
- NowPlaying.tsx
- VinylDisc.tsx
- EqualizerBars.tsx
