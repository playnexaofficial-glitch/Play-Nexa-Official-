// src/app/profile/games/page.tsx
'use client';
import ComingSoonPage from '@/components/profile/ComingSoonPage';
import { Gamepad2 } from 'lucide-react';
export default function ProfileGamesPage() {
  return (
    <ComingSoonPage
      title="Game History"
      Icon={Gamepad2}
      message="Your gaming achievements and high scores will be tracked here. This feature is in active development."
    />
  );
}
