# Task: Play Nexa Admin Panel — 4 Admin Pages

## Summary
Created four complete Next.js admin pages for the Play Nexa admin panel with AMOLED dark theme (#000000 base).

## Files Created

### 1. `/src/app/admin/games/page.tsx` — Game Manager
- Game interface with all specified fields (id, name, category, apk_url, cover_url, size, version, description, is_featured, is_hidden, downloads, created_at, updated_at)
- Grid layout (1-3 cols responsive) with cover image cards
- Category badges with color coding (Action=red, Puzzle=purple, Sports=green, Racing=yellow, Adventure=cyan, Casual=lavender)
- Featured star toggle, Hide/Show toggle, Edit/Delete buttons
- Add/Edit modal with all form fields including Featured toggle switch
- Delete ConfirmModal (danger=true)
- Loading spinner, error + retry states

### 2. `/src/app/admin/notifications/page.tsx` — Notification Center
- Composer section with Target radio buttons (All/Specific/Premium), Title (60 char counter), Message (200 char counter), Icon emoji selector chips, Action URL
- Live preview card showing how notification renders
- Send: supabase insert to notifications_log
- History table with columns: Icon, Title, Message (truncated), Target, Sent At, Delete
- Loading spinner, error + retry states

### 3. `/src/app/admin/analytics/page.tsx` — Analytics Dashboard
- Recharts integration: BarChart (#7C3AED), LineChart (#06B6D4), PieChart (5 colors)
- Fetches data with Promise.all from user_history, user_likes, movies, admin_activity_log
- Summary cards: Most Watched, Most Active User, Most Liked Channel, Peak Day
- Activity Log (last 50) with color-coded action badges (ADD_*=green, UPDATE_*=blue, DELETE_*=red, SEND_*=purple)
- Custom Tooltip: bg-[#1A1A1A] border-[#2D2D2D] rounded-xl

### 4. `/src/app/admin/settings/page.tsx` — App Settings
- App Branding section: App Name, Hero Title, Hero Subtitle inputs + Save Branding
- Colors section: Primary Color + Accent Color (color picker + hex input), Live preview with styled buttons
- Maintenance Mode: Toggle switch (red when ON), Message textarea (shown when enabled), Status indicator, Save Maintenance
- Danger Zone: bg-[#1A0000] border-[#FF0000]/30, Clear Movie Cache + Reset Feature States buttons → ConfirmModal danger=true

## Common Design Patterns
- All 'use client' components
- Import `{ supabase }` from `@/lib/supabaseAdmin`
- Import `{ useToast }` from `@/components/admin/Toast`
- Import `{ logActivity }` from `@/lib/adminAuth`
- Import `ConfirmModal` from `@/components/admin/ConfirmModal`
- Inputs: h-11 bg-[#1A1A1A] border-[#2D2D2D] rounded-xl, focus:border-[#7C3AED]
- Buttons: min-h-[44px], rounded-xl, transition 150ms
- Cards: bg-[#0F0F0F] border-[#1A1A1A] rounded-2xl
- No backdrop-blur, no styled-jsx, no mock data
- Loading spinner, error + retry states

## Lint Status
- Zero lint errors in all 4 new files
- Dev server compiles successfully
