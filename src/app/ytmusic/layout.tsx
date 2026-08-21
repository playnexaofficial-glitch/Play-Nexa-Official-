import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Music — Bangla & Hindi Songs',
  description:
    'Listen to free Bangla songs, Hindi music, ' +
    'romantic songs, lofi, remix and more. ' +
    'Stream unlimited music without subscription.',
  openGraph: {
    title: 'Free Music | Play Nexa',
    description: 'Stream free music online.',
  },
}

export default function YTMusicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
