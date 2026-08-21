# Task: Play Nexa Video Player - 3 Component Files

## Summary
Created three fully implemented 'use client' video player components in `src/components/video/`:
1. **VideoPlayer.tsx** - Full immersive video player screen
2. **PlayerControls.tsx** - Controls overlay with seekbar, menus, bottom sheets
3. **GestureOverlay.tsx** - Touch gesture layer with brightness/volume/double-tap/pinch

## Design System Applied
- Background: #000000 (pure black)
- Surface: #1A1A2E
- Accent: #7C3AED
- Cyan: #06B6D4
- Text: #FFFFFF / Text2: #9CA3AF
- Border: #2D2D44
- Max transition: 200ms, min touch target: 44px
- NO backdrop-blur, NO style jsx

## File Details

### VideoPlayer.tsx
- Full-screen black background, no chrome except controls overlay
- `<video>` tag with `playsInline` and `webkit-playsinline`
- Dynamic object-fit: fit→contain, fill→cover, 16:9→contain+aspect-ratio, 4:3→contain+aspect-ratio, zoom→cover
- Brightness via CSS `filter: brightness()` on video element
- Resume logic: shows "Resume from X:XX?" snackbar for 4 seconds when resumePosition > 5
- Saves position on unmount via localStorage
- StatusBar hide via Capacitor on native platforms
- Renders GestureOverlay + PlayerControls as children
- Derived `showResumeSnackbar` from state to avoid set-state-in-effect lint error

### PlayerControls.tsx
- TOP BAR: ← back (44px) + video title (truncated) + ⋮ menu dropdown
- Menu options: Subtitle / Audio Track / Playback Speed / Aspect Ratio / Lock Screen / PiP Mode / Sleep Timer / Share
- SEEKBAR: Custom styled range input with progress fill, current/total time labels
- CONTROLS ROW: prev | -10s | play/pause (64px) | +10s | next (all 44px min)
- BOTTOM TOOLBAR: [Aspect label] [Subtitle icon] [Volume/Mute icon] [Speed label] [Lock icon]
- Lock mode: shows ONLY lock icon at center, long press 1s to unlock
- Speed picker bottom sheet: 0.5× 0.75× 1× 1.25× 1.5× 2×
- Aspect ratio picker: Fit / Fill / 16:9 / 4:3 / Zoom
- Subtitle panel: Load .srt file, font size slider (12-24), color picker (white/yellow/green/cyan), position (top/bottom)
- Subtitle rendering: absolute positioned div with current SubCue text

### GestureOverlay.tsx
- 3 zones: left 30% | center 40% | right 30%
- LEFT ZONE: swipe up/down → Brightness (0-100%), shows ☀ + vertical progress bar
- RIGHT ZONE: swipe up/down → Volume (0-100%), shows 🔊 + vertical progress bar
- CENTER ZONE: single tap → toggle controls, double-tap left/right half → seek ±10s with ripple, long press → 2× speed badge
- PINCH: zoom in/out (scale 1.0-3.0) via two-finger pointer tracking
- All gestures via onPointerDown/Move/Up only
- When locked: only center tap passes through to show lock icon
- Pinch scale applied to video element via document.querySelector + inline style
- Ripple keyframes injected once via document.createElement('style')

## Lint Status
All three files pass lint with zero errors/warnings.

## Dependencies Used
- `useVideoPlayer` hook from `@/hooks/useVideoPlayer`
- `formatDuration`, `isNativePlatform`, `SubCue`, `VideoFile` from `@/lib/mediaUtils`
- lucide-react icons: ArrowLeft, MoreVertical, SkipBack, SkipForward, Play, Pause, RotateCcw, Maximize, Subtitles, Volume2, VolumeX, Gauge, Lock, Unlock, PictureInPicture2, Minimize, RectangleHorizontal, X
