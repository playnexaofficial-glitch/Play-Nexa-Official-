const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableOfContents,
} = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════════════
// PALETTE — Dark Tech Theme matching Play Nexa brand
// ═══════════════════════════════════════════════════════════════

const P = {
  primary: "#0B1220",
  body: "#1C2A3D",
  secondary: "#5B6B7D",
  accent: "#7C5CFF",
  surface: "#F5F7FA",
};
const c = (hex) => hex.replace("#", "");

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function safeText(value, placeholder = "【Please fill in】") {
  if (value === undefined || value === null || value === "" || String(value) === "NaN" || String(value) === "undefined") {
    return placeholder;
  }
  return String(value);
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "SimHei" } })],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 0 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function bodyBold(label, text) {
  return new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text: " " + text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
    ],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { line: 312, after: 40 },
    children: [new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function bulletBold(label, text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { line: 312, after: 40 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text: " " + text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
    ],
  });
}

function spacer(h = 100) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [] });
}

// Table builder
function makeTable(headers, rows) {
  const headerCells = headers.map(h =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] })],
      shading: { type: ShadingType.CLEAR, fill: c(P.accent) },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
    })
  );

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      cantSplit: true,
      children: row.map(cell =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: safeText(cell, "-"), size: 20, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] })],
          shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? "FFFFFF" : c(P.surface) },
          margins: { top: 50, bottom: 50, left: 100, right: 100 },
          width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headerCells }),
      ...dataRows,
    ],
  });
}

// ═══════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════

const coverChildren = [
  spacer(2800),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 1200, lineRule: "atLeast" },
    children: [new TextRun({ text: "PLAY NEXA", size: 84, bold: true, color: c(P.accent), font: { ascii: "Calibri", eastAsia: "SimHei" } })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 800, lineRule: "atLeast", before: 200 },
    children: [new TextRun({ text: "Master System Prompt", size: 52, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text: "Your Ultimate Media Universe", size: 28, italics: true, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  }),
  spacer(1200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Complete Application Reference Document", size: 22, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100 },
    children: [new TextRun({ text: "Features | Architecture | APIs | Database | Security | AI Integration | Deployment", size: 20, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  }),
  spacer(1500),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Version 1.0  |  June 2026  |  Confidential", size: 18, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  }),
];

// ═══════════════════════════════════════════════════════════════
// BODY CONTENT
// ═══════════════════════════════════════════════════════════════

const bodyContent = [];

// ─── 1. APP IDENTITY & OVERVIEW ─────────────────────────────
bodyContent.push(
  h1("1. App Identity & Overview"),
  h2("1.1 Basic Information"),
  makeTable(
    ["Property", "Value"],
    [
      ["App Name", "Play Nexa"],
      ["Tagline", "Your Ultimate Media Universe"],
      ["Type", "Mobile-first media streaming / entertainment PWA + Native Android App"],
      ["Android Package", "com.playnexa.app"],
      ["Primary Platform", "Web (PWA) + Android (Capacitor)"],
      ["Target Devices", "2GB RAM low-end Android phones (primary), all modern browsers"],
      ["Theme", "AMOLED Dark (#000000), Dark, Neon"],
      ["Language", "Bengali (primary UI language), English (technical)"],
      ["Previous Name", "Grovix (migration artifacts still present in codebase)"],
    ]
  ),
  spacer(100),
  h2("1.2 One-Line Description"),
  body("Play Nexa is a mobile-first, AMOLED-dark themed media entertainment super-app that combines a Movie Hub, Game Hub, Music Player, Smart Downloader, Video Player, Local Media Explorer, OTT Streaming, and a full Admin Panel with AI-powered content scanning, all built on Next.js 16 with React 19, TypeScript, Tailwind CSS 4, Supabase, Firebase, and Google Gemini AI. The app is designed to run on low-end 2GB RAM Android devices with graceful degradation when backend services are unavailable, featuring offline-first architecture, encrypted local storage, and a calculator disguise mode for privacy."),
  spacer(80),
  h2("1.3 Core Philosophy"),
  bulletBold("Graceful Degradation:", "Every service returns null/empty on failure. The app NEVER crashes due to missing configuration. If Supabase is down, local data still works. If Firebase is missing, the app loads with guest features. If Gemini keys are absent, keyword-based fallbacks handle AI tasks."),
  bulletBold("Offline-First:", "IndexedDB for media, playlists, downloads, and settings. PWA Service Worker for caching. Offline fallback page. Local JSON search engine works without any API."),
  bulletBold("2GB RAM Optimization:", "3-second database timeouts. No background polling loops. Fire-and-forget writes. Lightweight caching. No persistent WebSocket connections. Event-driven notification listeners only."),
  bulletBold("Zero-Cost Content Discovery:", "YouTube RSS feeds for movie/music discovery (no YouTube Data API key needed). Gemini AI free-tier with 5-key rotation for up to 7,500 daily AI requests. Local JSON data as always-available fallback."),
  bulletBold("Privacy-First:", "Calculator disguise mode hides the app behind a functional calculator. XOR+Base64 encrypted lock patterns. PIN-encrypted Safe Folder. IndexedDB blob storage for Private Locker. Security Q&A recovery."),
);

// ─── 2. TECHNOLOGY STACK ────────────────────────────────────
bodyContent.push(
  h1("2. Technology Stack & Architecture"),
  h2("2.1 Core Stack"),
  makeTable(
    ["Technology", "Version", "Purpose"],
    [
      ["Next.js", "16.1.1", "App Router, SSR, API Routes, PWA"],
      ["React", "19.0.0", "UI components, hooks, context"],
      ["TypeScript", "5.9.3", "Type safety (with ignoreBuildErrors: true)"],
      ["Tailwind CSS", "4.x", "Utility-first styling, AMOLED dark theme"],
      ["shadcn/ui + Radix", "Latest", "50+ accessible UI primitives"],
      ["Supabase JS", "2.106.2", "Primary database, auth, RLS, storage"],
      ["Firebase", "12.14.0", "Auth (email/Google/anonymous), FCM push notifications"],
      ["Google Gemini AI", "@google/generative-ai 0.24.1", "AI scanning, search, chat, feedback analysis"],
      ["Capacitor", "Latest", "Native Android build (appId: com.playnexa.app)"],
      ["Framer Motion", "12.23.2", "Animations and transitions"],
      ["Zustand", "5.0.6", "Lightweight state management"],
      ["Recharts", "2.15.4", "Admin analytics charts"],
      ["idb", "8.0.3", "IndexedDB wrapper for offline data"],
    ]
  ),
  spacer(100),
  h2("2.2 Architecture Pattern"),
  body("Play Nexa follows a Next.js App Router architecture with Server Components for SEO-critical pages and Client Components for interactive features. The app uses a hybrid rendering strategy: static pages for content that rarely changes, and dynamic server-side rendering for personalized content. API routes handle all backend logic, communicating with Supabase (PostgreSQL), Firebase, and Gemini AI. Client-side data flows through React hooks to Zustand stores and IndexedDB for offline persistence."),
  bulletBold("Frontend:", "React 19 Client Components + Next.js 16 App Router pages"),
  bulletBold("Backend:", "Next.js API Routes (25+ endpoints) running on Node.js/Bun"),
  bulletBold("Database:", "Supabase PostgreSQL (primary) + IndexedDB (offline) + SQLite/Prisma (legacy)"),
  bulletBold("Auth:", "Dual auth system - Firebase Auth + Supabase Auth running in parallel"),
  bulletBold("AI:", "Google Gemini AI with 5-key lottery rotation for free-tier maximization"),
  bulletBold("Caching:", "3-tier hybrid: Supabase -> localStorage -> hardcoded fallback"),
  bulletBold("Native:", "Capacitor wraps the PWA for Android deployment"),
  spacer(80),
  h2("2.3 Infrastructure"),
  makeTable(
    ["Component", "Technology", "Details"],
    [
      ["Web Server", "Caddy", "Reverse proxy: port 81 -> port 3000"],
      ["Process Manager", "PM2", "ecosystem.config.js for production"],
      ["Runtime", "Bun / Node.js", "bun for dev, node for production standalone"],
      ["PWA", "Service Worker", "/public/sw.js + offline.html fallback"],
      ["Database", "Supabase", "Hosted PostgreSQL at gjapqxeksdsiqhvlfrnb.supabase.co"],
      ["Native Build", "Capacitor", "Android: com.playnexa.app, webDir: out"],
    ]
  ),
);

// ─── 3. FEATURE MODULES ─────────────────────────────────────
bodyContent.push(
  h1("3. Feature Modules (Detailed)"),
  h2("3.1 Movie Hub"),
  body("The Movie Hub is the primary content discovery and viewing module. It aggregates movies from YouTube channels via RSS feeds (zero API cost), classifies them using Gemini AI or keyword-based filters, and presents them in a rich, categorized interface with hero banners, category filters, and a dedicated YouTube player. Movies are filtered by a strict 70-minute minimum duration to ensure only full-length content is displayed, rejecting shorts and clips automatically."),
  bulletBold("Content Source:", "YouTube RSS feeds from configured channels (free, no API key needed)"),
  bulletBold("Classification:", "Gemini AI scans videos as movie/music/skip. Keyword fallback when AI unavailable"),
  bulletBold("70-Minute Filter:", "Only videos with duration_sec >= 4200 shown as movies"),
  bulletBold("Player:", "Embedded YouTube player (iframe) with stealth mode and fullscreen support"),
  bulletBold("Categories:", "Language-based (Bengali, Hindi, English, etc.), genre-based, channel-based"),
  bulletBold("Social Features:", "Like, watchlist, watch history with progress tracking, share"),
  bulletBold("Fallback:", "12 hardcoded fallback movies always available, never an empty screen"),
  bulletBold("Components:", "MovieHub, MovieCard, MovieModal, HeroBanner, CategoryFilter, PlayNexaPlayer, YoutubePlayer, StealthPlayer, PlayerModal, RecommendedSection, RelatedMovies, LazyMovieSection, SocialRow, ChannelCard, OTTMovieHub"),
  spacer(80),
  h2("3.2 Game Hub"),
  body("The Game Hub provides a collection of browser-based games that can be played offline after initial loading. Games run inside iframes and support a full gamification system with scoring, coins, and leaderboards. The gamification layer uses Supabase RPC functions for atomic score updates and coin calculations, with local backup when the database is unreachable."),
  bulletBold("Game Types:", "Offline games, online games, mini games"),
  bulletBold("Gamification:", "Score tracking, coin earning (formula: floor(score/100) + minutes played, doubled for new high scores, max 50 coins)"),
  bulletBold("Leaderboard:", "Global and per-game rankings via Supabase RPC"),
  bulletBold("Offline Support:", "Local score backup when Supabase unreachable, auto-sync on reconnect (max 50 pending)"),
  bulletBold("Components:", "GameHub, GameCard, GamePlayer, GameCategories"),
  bulletBold("RPC Functions:", "fetch_user_game_data, fetch_game_score, upsert_game_score, fetch_user_coins, fetch_leaderboard, deduct_user_coins"),
  spacer(80),
  h2("3.3 Music Player"),
  body("The Music Player module provides a full-featured music experience with library browsing, playback controls, equalizer visualization, lyrics display, and a vinyl disc animation. Music content comes from the Supabase music_tracks table and YouTube Music integration. The player supports background playback and media session controls via the Capacitor Music Controls plugin."),
  bulletBold("Library:", "Browse by artist, album, genre; powered by Supabase music_tracks table"),
  bulletBold("Player Features:", "Play/pause, skip, shuffle, repeat, seek, volume control"),
  bulletBold("Visuals:", "Equalizer bars animation, vinyl disc rotation, now-playing banner"),
  bulletBold("Lyrics:", "Lyrics panel with synchronized display"),
  bulletBold("YouTube Music:", "Dedicated /ytmusic route for YouTube Music integration"),
  bulletBold("Components:", "MusicPlayer, MiniPlayer, NowPlaying, NowPlayingBanner, MusicLibrary, Equalizer, EqualizerBars, LyricsPanel, VinylDisc"),
  spacer(80),
  h2("3.4 Smart Downloader"),
  body("The Smart Downloader is a URL-paste-and-download system that automatically detects the platform from any pasted URL and routes the user to the appropriate download gateway. It supports 8 major platforms (YouTube, TikTok, Facebook, Instagram, Twitter/X, Vimeo, SoundCloud, and a Universal catch-all) using ultra-inclusive domain-first RegEx matching that catches mobile subdomains, short URLs, and regional variants."),
  bulletBold("Platform Detection:", "RegEx-based, domain-first matching for YouTube, TikTok, Facebook, Instagram, Twitter/X, Vimeo, SoundCloud, plus Universal catch-all"),
  bulletBold("Download Gateways:", "ssyoutube, savefrom, sfrom, snapsave, y2mate (source rotation for reliability)"),
  bulletBold("URL Types:", "Desktop URLs, mobile subdomains (m.youtube.com), short URLs (youtu.be, fb.watch, t.co), regional variants"),
  bulletBold("Audio Extraction:", "Client-side video-to-audio extraction using Web Audio API + WAV encoder"),
  bulletBold("Components:", "DownloadButton, UrlInput, PlatformDetector, FallbackModal, RecentDownloads"),
  bulletBold("Key Libraries:", "detector.ts (ultra-inclusive platform detection), router.ts (deep-link builder), downloader.ts (source rotation), sourceRotator.ts (platform-specific source finder)"),
  spacer(80),
  h2("3.5 Video Player"),
  body("The Video Player module handles both local device videos and streamed content. It includes gesture-based controls (swipe for volume/brightness/seek), a mini-player for background viewing, and a video library for browsing local files. The player is optimized for low-end devices with hardware acceleration hints and efficient memory management."),
  bulletBold("Playback:", "Full gesture controls (swipe up/down for volume/brightness, left/right for seek)"),
  bulletBold("Mini Player:", "Picture-in-picture style mini player for multitasking"),
  bulletBold("Local Library:", "Browse and play videos stored on device"),
  bulletBold("Components:", "VideoPlayer, PlayerControls, VideoLibrary, GestureOverlay"),
  spacer(80),
  h2("3.6 Local Media Explorer"),
  body("The Local Media Explorer provides access to media files stored on the user's device, including videos and music. It integrates with the Safe Folder (PIN-encrypted private storage) and the MP3 Extractor (client-side audio extraction from video files). The module uses Capacitor's native bridge for file system access on Android."),
  bulletBold("Video Explorer:", "Grid and list view of device videos"),
  bulletBold("Music Explorer:", "Browse device music files with metadata (jsmediatags library)"),
  bulletBold("Safe Folder:", "PIN-encrypted private media storage using XOR+Base64 encryption"),
  bulletBold("MP3 Extractor:", "Client-side video-to-MP3 conversion using Web Audio API"),
  bulletBold("Private Locker:", "IndexedDB blob storage for media files (pn_locker_db)"),
  bulletBold("Components:", "VideoGrid, VideoGridView, DeviceMusicExplorer, MusicList, SafeFolder, SafeFolderModal, PinDial, MP3Extractor, MP3ExtractorModal"),
  spacer(80),
  h2("3.7 Security System"),
  body("Play Nexa features a comprehensive security system designed to protect user privacy on shared devices. The system includes pattern lock, biometric authentication, a calculator disguise mode that hides the entire app behind a functional calculator, and a hidden app pool that intercepts specified apps. All security configurations are encrypted locally using XOR+Base64 encoding with PIN-derived keys."),
  bulletBold("Pattern Lock:", "Custom pattern with XOR+Base64 encrypted storage"),
  bulletBold("Biometric:", "Fingerprint/face unlock support via Capacitor native bridge"),
  bulletBold("Security Q&A:", "Recovery questions for lock reset"),
  bulletBold("Calculator Disguise:", "Full functional calculator UI that hides Play Nexa. Activated via disguise-context.tsx wrapper"),
  bulletBold("Hidden Pool:", "Apps in hidden pool are intercepted and force disguise mode"),
  bulletBold("Icon Changer:", "Custom app icons for the launcher"),
  bulletBold("Master Backdoor PIN:", "Obfuscated emergency bypass (recoverable from source code)"),
  bulletBold("Safe Folder:", "PIN-encrypted private media storage (safe-store.ts)"),
  bulletBold("Private Locker:", "IndexedDB blob storage (security-idb.ts, app-security-store.ts)"),
  bulletBold("Components:", "SecurityDashboard, AppLockOverlay, IconChangerModal, SystemAppsManager, AppLock, AppLookCustomizer, CalculatorDisguise"),
  spacer(80),
  h2("3.8 Search System"),
  body("The search system provides two modes: a zero-API local JSON search engine that works entirely offline, and an AI-powered natural language search that uses Gemini to understand queries and find matching content from the Supabase database. The local search engine filters through 70+ minutes of movie data stored in static JSON files, providing instant results without any network request."),
  bulletBold("Local Search:", "Zero-API JSON search engine (search.ts), works offline, 70-min movie filter"),
  bulletBold("AI Search:", "Gemini AI natural language search (/api/search/ai), converts user query to database filters"),
  bulletBold("Missing Requests:", "Searches with no results logged to missing_requests table for AI Movie Hunter"),
  bulletBold("Universal:", "Search across movies, music, games, and channels simultaneously"),
  spacer(80),
  h2("3.9 Feedback System"),
  body("The feedback system allows users to submit feedback through a floating widget, which is then analyzed by Gemini AI for priority classification, spam detection, and duplicate identification. An automated daily report is generated using a CRON-triggered API endpoint that summarizes feedback trends and detects feedback spikes (bursts of feedback in short periods)."),
  bulletBold("Feedback Widget:", "Floating button component (FeedbackWidget.tsx) for easy access"),
  bulletBold("AI Analysis:", "Gemini AI classifies priority (low/medium/high/critical), detects spam, identifies duplicates"),
  bulletBold("Spike Detection:", "Automatic detection of feedback bursts (more than 5 in 1 hour or 20 in 24 hours)"),
  bulletBold("Daily Report:", "CRON job at midnight triggers /api/admin/daily-report for AI-generated summary"),
  bulletBold("Admin Dashboard:", "Full feedback management at /admin/feedback with stats, filters, and AI insights"),
  bulletBold("Database:", "user_feedback table with AI analysis columns, admin_reports for daily summaries"),
);

// ─── 4. PAGE ROUTES ────────────────────────────────────────
bodyContent.push(
  h1("4. Page Routes & Navigation"),
  h2("4.1 Public Pages"),
  makeTable(
    ["Route", "Purpose", "Key Components"],
    [
      ["/", "Home page - feature grid (Download, Movies, Games, Music, Video, Platforms)", "BottomNav, TopBar, FeatureGrid"],
      ["/movies", "Movie Hub - browse movies by category/language", "MovieHub, HeroBanner, CategoryFilter"],
      ["/movies/[id]", "Movie detail + player", "MovieModal, PlayNexaPlayer"],
      ["/games", "Game Hub - browse offline/online/mini games", "GameHub, GameCard, GameCategories"],
      ["/games/[id]", "Game player (iframe embed)", "GamePlayer"],
      ["/music", "Music library + player", "MusicLibrary, MusicPlayer"],
      ["/music/player", "Full-screen music player", "NowPlaying, VinylDisc, Equalizer"],
      ["/download", "Smart download (paste URL, detect platform, redirect)", "UrlInput, PlatformDetector, FallbackModal"],
      ["/video", "Local video player + library", "VideoLibrary, VideoPlayer"],
      ["/shorts", "Short video clips", "ShortVideoPlayer"],
      ["/ytmusic", "YouTube Music hub", "YTMusicHub"],
      ["/ott", "OTT streaming hub", "OTTMovieHub"],
      ["/local", "Local device media (music + video)", "DeviceMusicExplorer, VideoGrid"],
      ["/platforms", "Streaming platform grid", "PlatformGrid"],
      ["/platforms/[id]", "Platform detail", "PlatformDetail"],
      ["/search", "Universal search (local JSON + AI)", "SearchBar, SearchResultGrid"],
      ["/library", "Saved media library", "SavedMediaList, PlaylistManager"],
      ["/profile", "User profile", "ProfileCard, CoinDisplay"],
      ["/settings", "App settings (theme, performance, security)", "SettingsPanel, ThemeSelector"],
      ["/security", "Security dashboard (app lock, disguise, hidden pool)", "SecurityDashboard, AppLockOverlay"],
    ]
  ),
  spacer(100),
  h2("4.2 Auth Pages"),
  makeTable(
    ["Route", "Purpose"],
    [
      ["/auth/login", "Login (Firebase email/Google/guest)"],
      ["/auth/signup", "Sign up (email/Google)"],
      ["/auth/callback", "OAuth callback handler"],
      ["/auth/reset", "Password reset"],
    ]
  ),
  spacer(100),
  h2("4.3 Admin Panel Pages"),
  makeTable(
    ["Route", "Purpose"],
    [
      ["/admin", "Admin dashboard with stats overview"],
      ["/admin/login", "Admin login (separate from user auth)"],
      ["/admin/channels", "YouTube channel CRUD management"],
      ["/admin/movies", "Movie database CRUD management"],
      ["/admin/users", "User management (list, ban, unban, delete)"],
      ["/admin/analytics", "Analytics dashboard with charts"],
      ["/admin/feedback", "Feedback dashboard with AI analysis"],
      ["/admin/keys", "Gemini API key management (add, health check, rotate)"],
      ["/admin/chat", "AI chat assistant (Gemini with Play Nexa context)"],
      ["/admin/vault", "Secure API key storage (api_vault table)"],
      ["/admin/notifications", "Push notification manager"],
      ["/admin/settings", "App settings (branding, colors, maintenance mode)"],
      ["/admin/features", "Feature flags (toggle movie_hub, game_hub, ytmusic, etc.)"],
      ["/admin/yt-importer", "YouTube channel importer (Data API v3)"],
      ["/admin/games", "Game management (add, edit, remove games)"],
    ]
  ),
);

// ─── 5. API ROUTES ──────────────────────────────────────────
bodyContent.push(
  h1("5. API Routes & Endpoints"),
  h2("5.1 Public APIs"),
  makeTable(
    ["Endpoint", "Method", "Purpose", "Auth Required"],
    [
      ["/api", "GET", "Health check (returns Hello, world!)", "No"],
      ["/api/rss", "GET", "RSS proxy - fetch YouTube channel RSS (avoids CORS)", "No"],
      ["/api/movies/rss", "GET", "RSS feed proxy with channel_id param", "No"],
      ["/api/movies/verify", "GET/POST", "Gemini AI video verification (movie/music/skip)", "No"],
      ["/api/search/ai", "POST", "AI-powered natural language search (Gemini + Supabase)", "No"],
    ]
  ),
  spacer(100),
  h2("5.2 Admin APIs (All require pna_admin_token cookie)"),
  makeTable(
    ["Endpoint", "Method", "Purpose"],
    [
      ["/api/admin/verify", "POST", "Verify admin user role in Supabase"],
      ["/api/admin/setup", "GET/POST", "One-time admin setup (creates first superadmin)"],
      ["/api/admin/channels", "GET/POST/PATCH/DELETE", "Full CRUD for yt_channels table"],
      ["/api/admin/channel-info", "GET", "Resolve YouTube @handle to UC channel ID"],
      ["/api/admin/channel-display", "POST", "Upsert channel display config"],
      ["/api/admin/sync-channel", "POST", "Sync single YouTube channel RSS to DB"],
      ["/api/admin/sync-all", "POST", "Sync all active channels"],
      ["/api/admin/gemini-scan", "POST", "Gemini AI scan of channel videos"],
      ["/api/admin/auto-scan", "POST", "Progressive batch scanner (pause/resume/stop)"],
      ["/api/admin/scan-status", "GET", "Real-time scan progress"],
      ["/api/admin/scan-jobs", "GET", "List recent scan jobs"],
      ["/api/admin/gemini-rotate", "GET/POST", "Gemini API key auto-rotation"],
      ["/api/admin/gemini-health", "POST", "Test Gemini key health"],
      ["/api/admin/movies", "GET/POST/DELETE", "Movie CRUD operations"],
      ["/api/admin/users", "GET/POST", "User management (list, ban, unban, delete)"],
      ["/api/admin/feedback-ai", "POST", "AI feedback analysis (priority, spam, duplicates)"],
      ["/api/admin/feedback-stats", "GET", "Aggregated feedback statistics"],
      ["/api/admin/daily-report", "GET/POST", "AI-generated daily feedback summary"],
      ["/api/admin/chat", "POST", "Admin AI chat (Gemini with Play Nexa context)"],
      ["/api/admin/yt-import", "GET/POST", "YouTube Data API v3 importer"],
    ]
  ),
  spacer(100),
  h2("5.3 API Authentication"),
  body("All admin API routes verify the pna_admin_token cookie. This cookie is set during admin login via the setAdminSession() function, which stores the session in both localStorage and as an httpOnly-compatible cookie. The admin session includes userId, email, role (superadmin/admin), and token. Activity logging writes to the admin_activity_log table for audit trail purposes."),
);

// ─── 6. DATABASE SCHEMA ─────────────────────────────────────
bodyContent.push(
  h1("6. Database Schema"),
  h2("6.1 Supabase PostgreSQL Tables"),
  makeTable(
    ["Table", "Purpose", "Key Columns"],
    [
      ["movies", "Movie Hub content", "youtube_id, title, thumbnail, channel, language, duration_sec, genre"],
      ["music_tracks", "Music content", "title, artist, album, duration, thumbnail, youtube_id"],
      ["user_likes", "User-movie likes", "user_id (FK), movie_id (FK), created_at"],
      ["user_watchlist", "User watchlists", "user_id (FK), movie_id (FK), added_at"],
      ["user_history", "Watch history", "user_id (FK), movie_id (FK), watch_count, watch_progress"],
      ["user_profiles", "Extended profiles", "auth_user_id, display_name, avatar_url, coins, auth_provider"],
      ["admin_users", "Admin roles", "auth_user_id, role (superadmin/admin), created_at"],
      ["admin_activity_log", "Audit trail", "admin_id, action, target, details, created_at"],
      ["admin_reports", "AI daily summaries", "report_date, summary, feedback_count, spike_alerts"],
      ["app_features", "Feature flags", "key, enabled, display_name, description"],
      ["app_settings", "Global settings", "key, value, category"],
      ["game_scores", "Game scores + coins", "auth_user_id, game_slug, high_score, coins, plays"],
      ["gemini_keys", "API key pool", "key_value, status (active/standby/exhausted/cooling), error_count"],
      ["api_vault", "Secure key storage", "service_name, key_value, description, created_at"],
      ["user_feedback", "User feedback", "user_id, message, type, priority, is_spam, ai_analysis, created_at"],
      ["notifications_log", "Push history", "title, body, type, sent_count, created_at"],
      ["push_subscriptions", "FCM tokens", "auth_user_id, device_token, platform, device_info"],
      ["videos", "Cached video data", "youtube_id, title, duration_sec, channel_id, scan_status"],
      ["missing_requests", "Search gaps", "query, count, last_searched"],
      ["yt_channels", "Channel config", "channel_id, channel_type, filter_keywords, exclude_keywords, auto_sync"],
      ["channel_display", "Display config", "channel_id, badge_color, visible, sort_order"],
      ["sync_logs", "Sync history", "channel_id, videos_added, videos_skipped, status"],
      ["ai_scan_jobs", "Scan progress", "channel_id, status, total_videos, scanned, progress_pct"],
    ]
  ),
  spacer(100),
  h2("6.2 Client-Side IndexedDB Stores"),
  makeTable(
    ["Database", "Store", "Purpose"],
    [
      ["playnexa-v1", "savedMedia", "Saved movies/shorts with watch progress"],
      ["playnexa-v1", "playlists", "User playlists (Watch Later, Favorites, Anime List, My Movies)"],
      ["playnexa-v1", "downloads", "Download history records"],
      ["playnexa-v1", "settings", "App settings persisted locally"],
      ["pn_locker_db", "blobs", "Private Locker media blobs"],
      ["pn_security_db", "locked_packages", "App Lock locked app packages"],
      ["pn_security_db", "hidden_pool", "Hidden app pool entries"],
    ]
  ),
  spacer(100),
  h2("6.3 Supabase RPC Functions"),
  makeTable(
    ["Function", "Purpose"],
    [
      ["fetch_user_game_data", "Get all game data for a user"],
      ["fetch_game_score", "Get score for specific user+game"],
      ["upsert_game_score", "Insert or update game score atomically"],
      ["fetch_user_coins", "Get total coins for a user"],
      ["fetch_leaderboard", "Get ranked leaderboard (global or per-game)"],
      ["deduct_user_coins", "Deduct coins from user balance"],
      ["register_push_token", "Register FCM token for push notifications"],
      ["unregister_push_token", "Remove FCM token on sign-out"],
    ]
  ),
);

// ─── 7. AUTHENTICATION SYSTEM ───────────────────────────────
bodyContent.push(
  h1("7. Authentication System"),
  h2("7.1 Dual Auth Architecture"),
  body("Play Nexa implements two independent authentication systems that run in parallel: Firebase Authentication for user-facing features (email/password, Google Sign-In, anonymous/guest access) and Supabase Authentication as an alternative/backup auth method. Both systems auto-sync user profiles to the Supabase user_profiles table on every successful login. Firebase Auth is the primary system used in the UI, while Supabase Auth provides additional OAuth capabilities."),
  spacer(80),
  h2("7.2 Firebase Auth Methods"),
  makeTable(
    ["Method", "Function", "Details"],
    [
      ["Email/Password Login", "loginWithEmail()", "Standard email + password authentication"],
      ["Email/Password Signup", "signupWithEmail()", "Create account with display name, auto-sync to Supabase"],
      ["Google Sign-In", "loginWithGoogle()", "Popup-based Google OAuth with email+profile scopes"],
      ["Guest (Anonymous)", "loginAsGuest()", "Firebase anonymous auth - no credentials needed"],
      ["Guest Upgrade (Email)", "upgradeGuestWithEmail()", "Link email credential to anonymous account"],
      ["Guest Upgrade (Google)", "upgradeGuestWithGoogle()", "Link Google credential to anonymous account"],
      ["Password Reset", "resetPassword()", "Firebase sendPasswordResetEmail"],
      ["Logout", "logout()", "Signs out from both Firebase and Supabase"],
    ]
  ),
  spacer(100),
  h2("7.3 Supabase Auth Methods"),
  makeTable(
    ["Method", "Function", "Details"],
    [
      ["Google OAuth", "signInWithGoogle()", "Supabase OAuth with offline access, redirectTo /auth/callback"],
      ["Email Signup", "signUpWithEmail()", "Email + password + display name, auto profile sync"],
      ["Email Login", "signInWithEmail()", "Email + password with Bengali error messages"],
      ["Anonymous", "signInAnonymously()", "Supabase anonymous auth"],
      ["Session", "getCurrentSession()", "Get current Supabase session"],
      ["Profile", "getCurrentUserProfile()", "Fetch user profile from user_profiles"],
      ["Sign Out", "signOut()", "Clears Supabase session + localStorage"],
      ["Password Reset", "resetPassword()", "Supabase resetPasswordForEmail"],
    ]
  ),
  spacer(100),
  h2("7.4 Admin Authentication"),
  body("Admin authentication is a separate system from user auth. It uses localStorage + cookies for session management (not JWT). The admin session stores userId, email, role (superadmin/admin), and token in localStorage with the prefix 'pna_admin_'. A cookie named 'pna_admin_token' is set with 2-hour expiry and SameSite=Strict for API route verification. A one-time setup endpoint (/api/admin/setup) creates the first superadmin account."),
  bulletBold("Session Keys:", "pna_admin_id, pna_admin_email, pna_admin_role, pna_admin_token"),
  bulletBold("Cookie:", "pna_admin_token, path=/, max-age=7200, SameSite=Strict"),
  bulletBold("Roles:", "superadmin (full access), admin (limited access)"),
  bulletBold("Setup:", "One-time /api/admin/setup endpoint creates first superadmin"),
  bulletBold("Verification:", "POST /api/admin/verify checks Supabase admin_users table"),
  bulletBold("Activity Log:", "All admin actions logged to admin_activity_log via logActivity()"),
  bulletBold("Auto-Redirect:", "Unauthenticated admin pages redirect to /admin/login"),
);

// ─── 8. AI INTEGRATION ──────────────────────────────────────
bodyContent.push(
  h1("8. AI Integration (Google Gemini)"),
  h2("8.1 Multi-Key Lottery System"),
  body("Play Nexa uses a sophisticated 5-key lottery rotation system for Gemini AI, designed to maximize the free tier (approximately 7,500 daily requests across 5 keys). The system uses lottery-style random key selection with health-aware weighting, automatic 429 rate-limit handling with 60-second cooldowns, and automatic fallback to the next available key on errors. Key health is tracked with consecutive error counts, total request counts, and rate-limit timestamps."),
  bulletBold("Key Pool:", "GEMINI_KEY_1 through GEMINI_KEY_5 from environment variables"),
  bulletBold("Selection:", "Lottery (random) with weighted preference for healthier keys (3x weight for 0 errors, 2x for 1 error, 1x for multiple errors)"),
  bulletBold("Rate Limit:", "60-second cooldown after 429 response, auto-switches to next key"),
  bulletBold("Max Retries:", "5 attempts across different keys before giving up"),
  bulletBold("Model:", "gemini-2.0-flash (default, free-tier friendly)"),
  bulletBold("Timeout:", "30 seconds per request with AbortController"),
  bulletBold("Structured Output:", "callGeminiJSON() with responseMimeType: application/json, manual JSON extraction fallback"),
  bulletBold("Health Check:", "getKeyPoolStatus() returns totalKeys, healthyKeys, rateLimitedKeys, per-key stats"),
  spacer(80),
  h2("8.2 Gemini AI Use Cases"),
  makeTable(
    ["Use Case", "Endpoint/Module", "How It Works"],
    [
      ["Video Classification", "geminiScanner.ts + /api/movies/verify", "Classifies YouTube videos as movie/music/skip using AI, keyword fallback available"],
      ["AI Search", "/api/search/ai", "Converts natural language query to Supabase database filters, returns matching content"],
      ["Admin Chat", "/api/admin/chat", "Context-aware AI chatbot for admin with Play Nexa system knowledge"],
      ["Feedback Analysis", "/api/admin/feedback-ai", "Classifies priority (low/medium/high/critical), detects spam, identifies duplicates"],
      ["Daily Report", "/api/admin/daily-report", "Generates daily feedback summary with trend analysis and spike detection"],
      ["Channel Scanning", "/api/admin/gemini-scan", "Batch AI scanning of channel videos for classification"],
      ["Auto Scan", "/api/admin/auto-scan", "Progressive batch scanner with pause/resume/stop, real-time progress"],
      ["Key Health", "/api/admin/gemini-health", "Test individual Gemini API key health and latency"],
      ["Key Rotation", "/api/admin/gemini-rotate", "Auto-rotate between active/standby/exhausted/cooling keys"],
    ]
  ),
);

// ─── 9. SECURITY SYSTEM ─────────────────────────────────────
bodyContent.push(
  h1("9. Security System (Detailed)"),
  h2("9.1 App Lock"),
  body("The App Lock feature allows users to protect the entire Play Nexa app or individual features with a pattern lock, biometric authentication, or security questions. Lock configuration is stored in app-lock-store.ts using XOR+Base64 encrypted localStorage. The lock pattern is converted to a string, XOR-encrypted with a derived key, and Base64-encoded for storage. On verification, the stored pattern is decrypted and compared with the user input."),
  bulletBold("Lock Types:", "Pattern lock, biometric (fingerprint/face), security Q&A"),
  bulletBold("Encryption:", "XOR + Base64 (obfuscation, not cryptographically secure)"),
  bulletBold("Storage:", "app-lock-store.ts (localStorage) synced with security-idb.ts (IndexedDB)"),
  bulletBold("Recovery:", "Security Q&A or master backdoor PIN"),
  spacer(80),
  h2("9.2 Calculator Disguise"),
  body("The Calculator Disguise is a unique privacy feature that transforms the entire Play Nexa app into a fully functional calculator. When activated, the app's UI is replaced with a calculator interface that performs real calculations. The actual Play Nexa app is hidden behind a special input sequence (e.g., typing a specific number and pressing equals). The disguise is implemented via a React context (disguise-context.tsx) that wraps the entire app."),
  bulletBold("Mechanism:", "React context wrapper (DisguiseWrapper) replaces app UI with calculator"),
  bulletBold("Trigger:", "Hidden app pool intercepts specified apps and forces disguise mode"),
  bulletBold("Calculator:", "Fully functional calculator UI with real math operations"),
  bulletBold("Unlock:", "Type master PIN on calculator and press equals to reveal Play Nexa"),
  spacer(80),
  h2("9.3 HTTP Security Headers"),
  body("The app sets standard HTTP security headers via next.config.ts to protect against common web vulnerabilities. These include X-Content-Type-Options: nosniff to prevent MIME-type sniffing, X-Frame-Options: DENY to prevent clickjacking, Referrer-Policy: strict-origin-when-cross-origin to limit referrer information leakage, and X-XSS-Protection: 1; mode=block to enable browser XSS filters."),
  spacer(80),
  h2("9.4 Security Considerations"),
  bulletBold("XOR Encryption:", "Local security uses XOR+Base64 which is obfuscation only, not cryptographically secure. Acceptable for local device storage where the primary threat is casual snooping, not sophisticated attacks."),
  bulletBold("Master PIN:", "The emergency backdoor PIN is obfuscated in source code but recoverable. This is intentional for production recovery but should be changed or removed for public releases."),
  bulletBold("Admin Auth:", "Uses localStorage + cookies rather than JWT-verified sessions. The pna_admin_token cookie has a 2-hour expiry. Consider upgrading to JWT for production."),
  bulletBold("No Rate Limiting:", "Most admin API routes lack rate limiting. Only the AI search endpoint has basic rate protection."),
  bulletBold("Middleware Disabled:", "The middleware.ts file is currently a passthrough (renamed to .bak). No route protection at the edge level."),
);

// ─── 10. ENVIRONMENT VARIABLES ──────────────────────────────
bodyContent.push(
  h1("10. Environment Variables & API Keys"),
  h2("10.1 Required Environment Variables"),
  makeTable(
    ["Variable", "Purpose", "Required", "Server Only"],
    [
      ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL", "Yes", "No"],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase anonymous key", "Yes", "No"],
      ["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role (bypasses RLS)", "Yes", "Yes"],
      ["NEXT_PUBLIC_FIREBASE_API_KEY", "Firebase API key", "Yes", "No"],
      ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "Firebase auth domain", "Yes", "No"],
      ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "Firebase project ID", "Yes", "No"],
      ["NEXT_PUBLIC_FIREBASE_APP_ID", "Firebase app ID", "Yes", "No"],
      ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "FCM sender ID", "For push", "No"],
      ["NEXT_PUBLIC_FCM_VAPID_KEY", "FCM VAPID key for web push", "For push", "No"],
    ]
  ),
  spacer(100),
  h2("10.2 AI & Integration Keys"),
  makeTable(
    ["Variable", "Purpose", "Required", "Server Only"],
    [
      ["GEMINI_KEY_1", "Gemini API key #1 (primary)", "Recommended", "Yes"],
      ["GEMINI_KEY_2", "Gemini API key #2 (rotation)", "Recommended", "Yes"],
      ["GEMINI_KEY_3", "Gemini API key #3 (rotation)", "Optional", "Yes"],
      ["GEMINI_KEY_4", "Gemini API key #4 (rotation)", "Optional", "Yes"],
      ["GEMINI_KEY_5", "Gemini API key #5 (rotation)", "Optional", "Yes"],
      ["GEMINI_API_KEY", "Single Gemini key (fallback)", "Optional", "Yes"],
      ["NEXT_PUBLIC_YOUTUBE_API_KEY", "YouTube Data API v3 key", "Optional", "No"],
      ["CRON_SECRET", "Secret for Supabase CRON triggers", "For daily report", "Yes"],
    ]
  ),
  spacer(100),
  h2("10.3 Infrastructure Variables"),
  makeTable(
    ["Variable", "Purpose", "Default"],
    [
      ["DATABASE_URL", "Prisma/SQLite connection", "file:/home/z/my-project/db/custom.db"],
      ["NEXT_PUBLIC_APP_URL", "App URL for internal API calls", "Auto-detected"],
      ["NEXT_PUBLIC_SITE_URL", "Site URL for SEO/metadata", "Auto-detected"],
    ]
  ),
  spacer(100),
  h2("10.4 Supabase Configuration"),
  bodyBold("Supabase URL:", "https://gjapqxeksdsiqhvlfrnb.supabase.co"),
  body("The Supabase project is pre-configured with this URL. The anon key and service role key need to be added to .env before the app can connect to the database. The supabaseAdmin.ts module returns null when keys are missing, and all dependent features degrade gracefully."),
);

// ─── 11. COMPONENT ARCHITECTURE ─────────────────────────────
bodyContent.push(
  h1("11. Component Architecture"),
  h2("11.1 Layout Shell"),
  makeTable(
    ["Component", "Purpose"],
    [
      ["BottomNav", "Bottom tab navigation (Home, Movies, Games, Music, Profile)"],
      ["TopBar", "App header with search, notifications, profile"],
      ["ClientLayoutGuards", "Hides nav/feedback on admin and auth pages"],
      ["DisguiseWrapper", "Wraps app in calculator disguise when activated"],
      ["OfflineIndicator", "Network status banner at top of screen"],
      ["ServiceWorkerRegistrar", "PWA service worker registration"],
      ["FeedbackWidget", "Floating feedback button (bottom-right)"],
    ]
  ),
  spacer(100),
  h2("11.2 Module Components"),
  makeTable(
    ["Module", "Components", "Count"],
    [
      ["Movie Hub", "MovieHub, MovieCard, MovieModal, HeroBanner, CategoryFilter, PlayNexaPlayer, YoutubePlayer, StealthPlayer, PlayerModal, RecommendedSection, RelatedMovies, LazyMovieSection, SocialRow, ChannelCard, OTTMovieHub", "15"],
      ["Game Hub", "GameHub, GameCard, GamePlayer, GameCategories", "4"],
      ["Music Player", "MusicPlayer, MiniPlayer, NowPlaying, NowPlayingBanner, MusicLibrary, Equalizer, EqualizerBars, LyricsPanel, VinylDisc", "9"],
      ["Video Player", "VideoPlayer, PlayerControls, VideoLibrary, GestureOverlay", "4"],
      ["Download System", "DownloadButton, UrlInput, PlatformDetector, FallbackModal, RecentDownloads", "5"],
      ["Local Media", "VideoGrid, VideoGridView, DeviceMusicExplorer, MusicList, SafeFolder, SafeFolderModal, PinDial, MP3Extractor, MP3ExtractorModal", "12+"],
      ["Security", "SecurityDashboard, AppLockOverlay, IconChangerModal, SystemAppsManager", "4"],
      ["Admin", "Sidebar, TopBar, StatsCard, DataTable, ConfirmModal, Toast, AdminBackdoor", "7"],
      ["UI Primitives", "50+ shadcn/ui components (Button, Dialog, Input, Select, Tabs, etc.)", "50+"],
    ]
  ),
  spacer(100),
  h2("11.3 Custom Hooks (20+)"),
  makeTable(
    ["Hook", "Purpose"],
    [
      ["useAuth", "Firebase auth state management"],
      ["useProfile", "User profile fetching and updating"],
      ["useSettings", "App settings (theme, performance, security)"],
      ["useTheme", "Theme switching (dark/amoled/neon)"],
      ["useMovies", "Movie data fetching with caching"],
      ["useLibrary", "Saved media library management"],
      ["useDownload", "Download management and progress"],
      ["useMusicPlayer", "Music player state and controls"],
      ["usePlayer", "Video player state and controls"],
      ["useVideoPlayer", "Video player gesture controls"],
      ["useGameData", "Game data, scores, and coins"],
      ["useGameCache", "Game asset caching"],
      ["useGameDownload", "Game download management"],
      ["useNotifications", "Push notification handling"],
      ["useOfflineMedia", "Offline media access"],
      ["useMediaLibrary", "Media library browsing"],
      ["useSaveMedia", "Save media to library"],
      ["usePlaylist", "Playlist CRUD operations"],
      ["use-toast", "Toast notification display"],
      ["use-mobile", "Mobile device detection"],
    ]
  ),
);

// ─── 12. DATA FLOW & CACHING ────────────────────────────────
bodyContent.push(
  h1("12. Data Flow & Caching Strategy"),
  h2("12.1 Three-Tier Hybrid Cache"),
  body("Play Nexa implements a three-tier caching strategy to ensure data is always available, even when backend services are down. The first tier is Supabase (PostgreSQL), which serves as the source of truth. If Supabase is unreachable, the app falls back to localStorage cache with a 30-minute TTL. If even localStorage is empty, hardcoded fallback data is used. This ensures the app never shows an empty or broken state."),
  bulletBold("Tier 1:", "Supabase PostgreSQL (source of truth, 3-second timeout)"),
  bulletBold("Tier 2:", "localStorage cache (30-minute TTL, cache.ts / db-cache.ts)"),
  bulletBold("Tier 3:", "Hardcoded fallback data (12 fallback movies, static JSON files)"),
  spacer(80),
  h2("12.2 Data Flow Examples"),
  h3("Movie Loading Flow"),
  bullet("1. User opens Movie Hub page"),
  bullet("2. useMovies hook checks localStorage cache (30-min TTL)"),
  bullet("3. Cache miss: Fetch from Supabase movies table (3s timeout)"),
  bullet("4. Cache result in localStorage for future loads"),
  bullet("5. On Supabase failure: Load from static JSON files in src/data/"),
  bullet("6. On JSON failure: Show 12 hardcoded fallback movies"),
  bullet("7. Never show empty state - always have content to display"),
  spacer(80),
  h3("Game Score Flow"),
  bullet("1. User finishes a game with score X"),
  bullet("2. Coins calculated: floor(X/100) + minutes played (doubled for high score, max 50)"),
  bullet("3. upsert_game_score RPC called on Supabase (3s timeout)"),
  bullet("4. On success: Update local cache, show result"),
  bullet("5. On failure: Save to localStorage pending scores queue (max 50)"),
  bullet("6. On next successful connection: Auto-sync pending scores via syncPendingScores()"),
  spacer(80),
  h3("AI Search Flow"),
  bullet("1. User types natural language query in search bar"),
  bullet("2. POST /api/search/ai with query text"),
  bullet("3. Gemini AI converts query to structured Supabase filters"),
  bullet("4. Query executed against movies/music_tracks tables"),
  bullet("5. Results returned to user with relevance ranking"),
  bullet("6. If no results: Query logged to missing_requests for AI Movie Hunter"),
);

// ─── 13. DOWNLOAD SYSTEM ────────────────────────────────────
bodyContent.push(
  h1("13. Download System (Detailed)"),
  h2("13.1 Platform Detection"),
  body("The platform detector (detector.ts) uses ultra-inclusive domain-first RegEx matching to identify the source platform from any pasted URL. It supports 7 major platforms plus a universal catch-all. For each platform, multiple URL patterns are matched including desktop URLs, mobile subdomains, short URLs, and regional variants. Any valid URL that doesn't match a known platform is routed through the universal engine (sfrom.net gateway), ensuring 100% coverage with no 'not supported' blocker."),
  makeTable(
    ["Platform", "URL Patterns Matched", "Color"],
    [
      ["YouTube", "youtube.com, m.youtube.com, music.youtube.com, youtu.be, youtube-nocookie.com", "#FF0000"],
      ["TikTok", "tiktok.com, vt.tiktok.com, vm.tiktok.com", "#FE2C55"],
      ["Facebook", "facebook.com, m.facebook.com, fb.watch, fb.com, fb.me, web.facebook.com", "#1877F2"],
      ["Instagram", "instagram.com, m.instagram.com, instagr.am, ig.me, dd.instagram.com", "#E1306C"],
      ["Twitter/X", "twitter.com, mobile.twitter.com, x.com, t.co", "#1DA1F2"],
      ["Vimeo", "vimeo.com, player.vimeo.com, vod.vimeo.com", "#1AB7EA"],
      ["SoundCloud", "soundcloud.com, m.soundcloud.com, on.soundcloud.com", "#FF5500"],
      ["Universal", "Any valid URL not matching above (routed via sfrom.net)", "#7C5CFF"],
    ]
  ),
  spacer(80),
  h2("13.2 Download Gateway Rotation"),
  body("Multiple download gateways are available for each platform. The sourceRotator.ts module rotates between gateways to ensure availability. If one gateway is down or blocked, the next one is tried automatically. The router.ts module builds deep-links to specific download services based on the detected platform and video ID."),
  bulletBold("YouTube:", "ssyoutube.com, savefrom.net, sfrom.net, y2mate.com"),
  bulletBold("Facebook:", "snapsave.app, savefrom.net"),
  bulletBold("Instagram:", "snapsave.app, savefrom.net"),
  bulletBold("Universal:", "sfrom.net (catch-all for any URL)"),
  spacer(80),
  h2("13.3 Audio Extraction"),
  body("The MP3 Extractor component provides client-side video-to-audio conversion using the Web Audio API. It decodes the video file, processes the audio channel, encodes it as a WAV file, and provides a download link. This works entirely in the browser without any server-side processing, making it available even when offline. The jsmediatags library is used for reading and writing ID3 tags on the extracted audio files."),
);

// ─── 14. PUSH NOTIFICATIONS ─────────────────────────────────
bodyContent.push(
  h1("14. Push Notifications"),
  h2("14.1 Architecture"),
  body("The push notification system uses Firebase Cloud Messaging (FCM) for both foreground and background message delivery. The architecture is designed to be memory-efficient with zero background loops. FCM onMessage is event-driven (zero CPU when idle), and the Service Worker handles background push events (browser-managed, zero app memory). Token registration with Supabase is fire-and-forget, and all listeners are properly disposed on cleanup."),
  bulletBold("Foreground:", "FCM onMessage listener (event-driven, zero CPU when idle)"),
  bulletBold("Background:", "Service Worker (firebase-messaging-sw.js) handles push events"),
  bulletBold("Token Storage:", "FCM token cached in localStorage + registered in Supabase push_subscriptions"),
  bulletBold("Registration:", "register_push_token RPC on login, unregister_push_token on logout"),
  bulletBold("Lazy Loading:", "Firebase SDK dynamically imported only when user grants notification permission"),
  spacer(80),
  h2("14.2 Notification Preferences"),
  body("Users can control which notification types they receive through preferences stored in localStorage. The system supports three notification categories: new content (new movies, music, games), achievements (game scores, coin milestones), and system (app updates, maintenance). Each category can be independently enabled or disabled, and the overall notification toggle acts as a master switch."),
  makeTable(
    ["Preference", "Default", "Description"],
    [
      ["enabled", "true", "Master toggle for all notifications"],
      ["newContent", "true", "Notifications about new movies, music, games"],
      ["achievements", "true", "Game score and coin milestone notifications"],
      ["system", "true", "App updates and maintenance notifications"],
    ]
  ),
);

// ─── 15. PWA & NATIVE APP ───────────────────────────────────
bodyContent.push(
  h1("15. PWA & Native App"),
  h2("15.1 Progressive Web App"),
  body("Play Nexa is built as a Progressive Web App with full offline support. The Service Worker (sw.js) caches app shell and static assets for instant loading. An offline.html fallback page is shown when the network is unavailable. The PWA manifest.json defines the app name, icons, theme color (#000000), and display mode (standalone). The app registers the service worker on first load and handles updates gracefully."),
  bulletBold("Service Worker:", "/public/sw.js - caches app shell and static assets"),
  bulletBold("Offline Page:", "/public/offline.html - shown when network unavailable"),
  bulletBold("Manifest:", "/public/manifest.json - PWA configuration"),
  bulletBold("Icons:", "/public/icon-192x192.png, icon-512x512.png, etc."),
  bulletBold("Theme Color:", "#000000 (AMOLED black)"),
  bulletBold("Display:", "standalone (no browser chrome)"),
  spacer(80),
  h2("15.2 Capacitor Android Build"),
  body("The Capacitor configuration wraps the Play Nexa PWA as a native Android application. The build uses HTTPS scheme with cleartext disabled for security. The status bar and splash screen use the AMOLED black (#000000) background. The app ID is com.playnexa.app, and the web directory is set to 'out' (Next.js static export). Hardware acceleration and input capture are enabled for smooth media playback."),
  makeTable(
    ["Config", "Value"],
    [
      ["App ID", "com.playnexa.app"],
      ["App Name", "Play Nexa"],
      ["Web Directory", "out"],
      ["Android Scheme", "https"],
      ["Cleartext", "false (HTTPS only)"],
      ["Mixed Content", "false (blocked)"],
      ["Debugging", "false (production)"],
      ["Status Bar", "dark style, #000000 background"],
      ["Splash Screen", "2000ms duration, #000000 background"],
      ["Keyboard", "body resize, resizeOnFullScreen"],
    ]
  ),
);

// ─── 16. DESIGN PATTERNS ────────────────────────────────────
bodyContent.push(
  h1("16. Design Patterns & Performance Optimization"),
  h2("16.1 Key Design Patterns"),
  makeTable(
    ["Pattern", "Implementation", "Benefit"],
    [
      ["Graceful Degradation", "Every service returns null/empty on failure", "App never crashes due to missing config"],
      ["Hybrid Caching", "Supabase -> localStorage -> Fallback (3-tier)", "Always have data to display"],
      ["5-Key Lottery Rotation", "Random key selection with health weighting", "Maximizes free tier, auto-recovery"],
      ["Zero YouTube API", "RSS feeds for content discovery", "No API key needed, zero cost"],
      ["70-Minute Movie Filter", "duration_sec >= 4200 strict check", "Only full-length movies, no clips"],
      ["Dual Auth", "Firebase + Supabase auth in parallel", "Redundancy, multiple login methods"],
      ["Offline-First", "IndexedDB for all user data", "Works without network"],
      ["Fire-and-Forget Writes", "Non-blocking database writes", "No UI freeze on slow networks"],
      ["Event-Driven Notifications", "FCM onMessage (no polling)", "Zero CPU when idle"],
      ["Calculator Disguise", "Full calculator UI overlay", "Privacy protection on shared devices"],
    ]
  ),
  spacer(100),
  h2("16.2 Performance Optimizations for 2GB RAM"),
  bulletBold("3-Second DB Timeout:", "All Supabase queries have a 3-second timeout to prevent UI freezing on slow networks. Implemented via Promise.race with setTimeout."),
  bulletBold("No Background Loops:", "Zero continuous polling or background intervals. All data fetching is triggered by user actions or event-driven listeners."),
  bulletBold("Fire-and-Forget Writes:", "Database writes (save progress, update scores) are non-blocking. If they fail, data is queued locally and synced later."),
  bulletBold("Lazy Loading:", "Firebase SDK is dynamically imported only when needed (notification permission grant). Heavy components use React.lazy for code splitting."),
  bulletBold("Thumbnail Quality:", "Three quality levels (low: mqdefault, medium: hqdefault, high: maxresdefault) to reduce data usage on slow connections."),
  bulletBold("Smart Loading:", "Battery saver mode disables animations. Lite animation mode reduces motion. Performance boost mode prioritizes rendering."),
  bulletBold("Lightweight Cache:", "localStorage-based cache with 30-minute TTL. No in-memory cache that would consume RAM."),
  bulletBold("Minimal Re-renders:", "Zustand for efficient state updates. React Query for smart data fetching and caching."),
);

// ─── 17. DEPLOYMENT ─────────────────────────────────────────
bodyContent.push(
  h1("17. Deployment & Infrastructure"),
  h2("17.1 Production Deployment"),
  body("Play Nexa is deployed as a Next.js standalone application using the output: 'standalone' configuration in next.config.ts. The build process copies static assets and public files to the standalone output directory. Production runs via Node.js executing the standalone server.js, managed by PM2 for process monitoring and auto-restart. Caddy serves as a reverse proxy, forwarding traffic from port 81 to the Next.js server on port 3000."),
  bulletBold("Build:", "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"),
  bulletBold("Run:", "NODE_ENV=production bun .next/standalone/server.js"),
  bulletBold("Proxy:", "Caddy reverse proxy (port 81 -> 3000)"),
  bulletBold("Process Manager:", "PM2 with ecosystem.config.js"),
  bulletBold("Dev:", "next dev -p 3000 (with tee to dev.log)"),
  spacer(80),
  h2("17.2 Setup Sequence"),
  bullet("1. Clone the repository and install dependencies (bun install)"),
  bullet("2. Copy .env to .env.local and fill in all required API keys"),
  bullet("3. Run the Supabase schema SQL (supabase/schema-complete.sql or download/playnexa-complete-setup.sql)"),
  bullet("4. Create the first admin account via POST /api/admin/setup"),
  bullet("5. Add YouTube channels via Admin Panel -> Channels"),
  bullet("6. Add Gemini API keys via Admin Panel -> Keys"),
  bullet("7. Run first channel sync via Admin Panel -> Sync All"),
  bullet("8. Build for production: bun run build"),
  bullet("9. Start production server: bun run start"),
  bullet("10. For Android: npx cap sync && npx cap open android"),
  spacer(80),
  h2("17.3 CRON Jobs"),
  body("Play Nexa supports automated daily report generation via Supabase CRON triggers. The CRON job calls the /api/admin/daily-report endpoint at midnight, which uses Gemini AI to analyze the day's feedback, generate a summary, detect spikes, and store the report in the admin_reports table. The CRON_SECRET environment variable is used to authenticate the trigger."),
  bulletBold("Daily Report CRON:", "Triggers at midnight via Supabase pg_cron"),
  bulletBold("Endpoint:", "POST /api/admin/daily-report with CRON_SECRET header"),
  bulletBold("Report Contents:", "Total feedback count, priority breakdown, spam count, duplicate detection, spike alerts, AI-generated summary, trend analysis"),
  bulletBold("Storage:", "Reports saved to admin_reports table with report_date, summary, and metadata"),
);

// ─── 18. APP SETTINGS ───────────────────────────────────────
bodyContent.push(
  h1("18. App Settings & Configuration"),
  h2("18.1 User Settings (settings.ts)"),
  makeTable(
    ["Setting", "Options", "Default", "Effect"],
    [
      ["theme", "dark / amoled / neon", "dark", "App color scheme"],
      ["smoothMode", "boolean", "true", "Smooth animations enabled"],
      ["batterySaver", "boolean", "false", "Reduces animations and effects"],
      ["liteAnimation", "boolean", "false", "Minimal animation mode"],
      ["performanceBoost", "boolean", "false", "Prioritize rendering speed"],
      ["lowDataMode", "boolean", "false", "Reduce network usage"],
      ["smartLoading", "boolean", "true", "Intelligent content preloading"],
      ["thumbnailQuality", "low / medium / high", "medium", "YouTube thumbnail resolution"],
    ]
  ),
  spacer(100),
  h2("18.2 Admin Settings (app_settings table)"),
  body("Global application settings are stored in the Supabase app_settings table and managed via the /admin/settings page. These include branding configuration (app name, tagline, logo), color scheme overrides, maintenance mode toggle, and other global parameters that affect all users. Changes are applied immediately without requiring a restart."),
  spacer(80),
  h2("18.3 Feature Flags (app_features table)"),
  body("Feature flags allow granular control over which features are visible to users. Each flag has a key, enabled state, display name, and description. Flags can be toggled from the /admin/features page without code changes or deployment. Common feature flags include: movie_hub, game_hub, ytmusic, downloader, shorts, ott_hub, ai_search, and feedback_widget."),
);

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ASSEMBLY
// ═══════════════════════════════════════════════════════════════

const allNoBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
  insideHorizontal: { style: BorderStyle.NONE, size: 0 },
  insideVertical: { style: BorderStyle.NONE, size: 0 },
};

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
          size: 22,
          color: c(P.body),
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
      heading1: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: c(P.primary) },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: c(P.primary) },
        paragraph: { spacing: { before: 280, after: 120, line: 312 } },
      },
      heading3: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 24, bold: true, color: c(P.body) },
        paragraph: { spacing: { before: 200, after: 100, line: 312 } },
      },
    },
  },
  numbering: {
    config: [],
  },
  sections: [
    // ── Section 1: Cover Page ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: allNoBorders,
          rows: [
            new TableRow({
              height: { value: 16838, rule: "exact" },
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: allNoBorders,
                  shading: { type: ShadingType.CLEAR, fill: "000000" },
                  verticalAlign: "top",
                  children: coverChildren,
                }),
              ],
            }),
          ],
        }),
      ],
    },
    // ── Section 2: TOC ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "Play Nexa \u2014 Master System Prompt", size: 16, color: "999999", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "999999" })],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ text: "Table of Contents", size: 36, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })],
        }),
        new TableOfContents("Table of Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({ text: "Note: Right-click the Table of Contents and select \u201cUpdate Field\u201d to refresh page numbers after opening in Word.", size: 18, italics: true, color: "888888", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // ── Section 3: Body Content ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "Play Nexa \u2014 Master System Prompt", size: 16, color: "999999", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "999999" })],
            }),
          ],
        }),
      },
      children: bodyContent,
    },
  ],
});

// ═══════════════════════════════════════════════════════════════
// GENERATE
// ═══════════════════════════════════════════════════════════════

const OUTPUT = "/home/z/my-project/download/Play-Nexa-Master-System-Prompt.docx";

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Document generated:", OUTPUT);
}).catch(err => {
  console.error("Generation failed:", err);
  process.exit(1);
});
