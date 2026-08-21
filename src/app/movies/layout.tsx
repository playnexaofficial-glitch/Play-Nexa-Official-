import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Movies — Bangla, Hindi & More',
  description:
    'Watch free Bangla movies, Hindi dubbed movies, ' +
    'web series, natok, and telefilms online. ' +
    'New movies added daily. No subscription.',
  openGraph: {
    title: 'Free Movies | Play Nexa',
    description:
      'Stream free Bangla & Hindi movies online.',
  },
}

export default function MoviesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
