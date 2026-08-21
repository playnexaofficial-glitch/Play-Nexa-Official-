// ── Play Nexa Fallback Movies ───────────────────────────────────
// These show when API quota is exceeded or network fails.
// Users NEVER see an empty screen.

import type { YouTubeMovie } from './types'

export const FALLBACK_MOVIES: YouTubeMovie[] = [
  {
    id: 'dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: 'The Dark Knight',
    thumbnail: 'https://img.youtube.com/vi/EXeTwQWrcwY/hqdefault.jpg',
    duration: '2h 32m',
    durationSec: 9120,
    channel: 'Warner Bros',
    channelId: '',
    description: 'Batman raises the stakes in his war on crime. With the help of Lt. Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.',
    publishedAt: '',
    views: '45M views',
    likes: '1.2M',
    comments: '89K',
    rawViews: 45000000,
    language: 'English',
    genre: ['Action', 'Crime'],
    category: 'Hollywood',
    free: true,
    source: 'Fallback',
    trending: true,
    viral: false,
  },
  {
    id: 'YoHD9XEInc0',
    videoId: 'YoHD9XEInc0',
    title: 'Interstellar Full Movie',
    thumbnail: 'https://img.youtube.com/vi/zSWdZVtXT7E/hqdefault.jpg',
    duration: '2h 49m',
    durationSec: 10140,
    channel: 'Paramount Movies',
    channelId: '',
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival as Earth becomes uninhabitable.',
    publishedAt: '',
    views: '38M views',
    likes: '980K',
    comments: '120K',
    rawViews: 38000000,
    language: 'English',
    genre: ['Sci-Fi', 'Adventure'],
    category: 'Hollywood',
    free: true,
    source: 'Fallback',
    trending: true,
    viral: false,
  },
  {
    id: 'TcMBFSGVi1c',
    videoId: 'TcMBFSGVi1c',
    title: 'Avengers Full Movie Hindi',
    thumbnail: 'https://img.youtube.com/vi/TcMBFSGVi1c/hqdefault.jpg',
    duration: '2h 23m',
    durationSec: 8580,
    channel: 'Marvel India',
    channelId: '',
    description: 'Earth\'s mightiest heroes must come together and learn to fight as a team if they are to stop the mischievous Loki and his alien army from enslaving humanity.',
    publishedAt: '',
    views: '62M views',
    likes: '2.1M',
    comments: '340K',
    rawViews: 62000000,
    language: 'Hindi',
    genre: ['Action', 'Adventure'],
    category: 'Hollywood',
    free: true,
    source: 'Fallback',
    trending: true,
    viral: true,
  },
  {
    id: '6ZfuNTqbHE8',
    videoId: '6ZfuNTqbHE8',
    title: 'Your Name (Kimi no Na wa)',
    thumbnail: 'https://img.youtube.com/vi/xU47nhruN-Q/hqdefault.jpg',
    duration: '1h 52m',
    durationSec: 6720,
    channel: 'Toho Animation',
    channelId: '',
    description: 'Two strangers find themselves linked in a bizarre way. When a connection forms, will distance be the only thing to keep them apart?',
    publishedAt: '',
    views: '28M views',
    likes: '1.5M',
    comments: '210K',
    rawViews: 28000000,
    language: 'Japanese',
    genre: ['Anime', 'Romance'],
    category: 'Anime',
    free: true,
    source: 'Fallback',
    trending: false,
    viral: true,
  },
  {
    id: 'k9L9vu9M4Ag',
    videoId: 'k9L9vu9M4Ag',
    title: 'Parasite Full Movie',
    thumbnail: 'https://img.youtube.com/vi/5xH0HfJHsaY/hqdefault.jpg',
    duration: '2h 12m',
    durationSec: 7920,
    channel: 'CJ Entertainment',
    channelId: '',
    description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    publishedAt: '',
    views: '19M views',
    likes: '870K',
    comments: '95K',
    rawViews: 19000000,
    language: 'Korean',
    genre: ['Thriller', 'Drama'],
    category: 'Korean',
    free: true,
    source: 'Fallback',
    trending: false,
    viral: false,
  },
  {
    id: '3WAOxKOOSlg',
    videoId: '3WAOxKOOSlg',
    title: '3 Idiots Full Movie',
    thumbnail: 'https://img.youtube.com/vi/K0eDlFX9GMc/hqdefault.jpg',
    duration: '2h 50m',
    durationSec: 10200,
    channel: 'Rajkumar Hirani Films',
    channelId: '',
    description: 'Two friends are searching for their long-lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently.',
    publishedAt: '',
    views: '95M views',
    likes: '4.2M',
    comments: '580K',
    rawViews: 95000000,
    language: 'Hindi',
    genre: ['Comedy', 'Drama'],
    category: 'Bollywood',
    free: true,
    source: 'Fallback',
    trending: true,
    viral: true,
  },
  {
    id: 'mGnkIkAR4-c',
    videoId: 'mGnkIkAR4-c',
    title: 'Spirited Away Full Movie',
    thumbnail: 'https://img.youtube.com/vi/ByXuk9QqQkk/hqdefault.jpg',
    duration: '2h 5m',
    durationSec: 7500,
    channel: 'Studio Ghibli',
    channelId: '',
    description: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.',
    publishedAt: '',
    views: '22M views',
    likes: '1.1M',
    comments: '150K',
    rawViews: 22000000,
    language: 'Japanese',
    genre: ['Anime', 'Fantasy'],
    category: 'Anime',
    free: true,
    source: 'Fallback',
    trending: false,
    viral: false,
  },
  {
    id: 'Ke1Y3P9D0Bc',
    videoId: 'Ke1Y3P9D0Bc',
    title: 'Dangal Full Movie',
    thumbnail: 'https://img.youtube.com/vi/x_7YlGv9u1g/hqdefault.jpg',
    duration: '2h 41m',
    durationSec: 9660,
    channel: 'Aamir Khan Productions',
    channelId: '',
    description: 'A father trains his daughters to become world-class wrestlers in a society where women are expected to be submissive and domestic.',
    publishedAt: '',
    views: '88M views',
    likes: '3.8M',
    comments: '490K',
    rawViews: 88000000,
    language: 'Hindi',
    genre: ['Drama', 'Sport'],
    category: 'Bollywood',
    free: true,
    source: 'Fallback',
    trending: false,
    viral: false,
  },
  {
    id: 'giXco2jaZ_4',
    videoId: 'giXco2jaZ_4',
    title: 'Train to Busan',
    thumbnail: 'https://img.youtube.com/vi/pyWuHv2-Ork/hqdefault.jpg',
    duration: '1h 58m',
    durationSec: 7080,
    channel: 'Next Entertainment World',
    channelId: '',
    description: 'While a zombie virus breaks out in South Korea, passengers struggle to survive on the train from Seoul to Busan.',
    publishedAt: '',
    views: '15M views',
    likes: '620K',
    comments: '78K',
    rawViews: 15000000,
    language: 'Korean',
    genre: ['Horror', 'Action'],
    category: 'Korean',
    free: true,
    source: 'Fallback',
    trending: false,
    viral: false,
  },
  {
    id: 'hA6hldpSTF8',
    videoId: 'hA6hldpSTF8',
    title: 'Baahubali 2 Hindi Dubbed',
    thumbnail: 'https://img.youtube.com/vi/220Lj4aq_kE/hqdefault.jpg',
    duration: '2h 47m',
    durationSec: 10020,
    channel: 'Arka Media Works',
    channelId: '',
    description: 'The conclusion of the epic Baahubali saga. When Shiva learns about his heritage, he begins to look for answers and finds an entire kingdom depending on him.',
    publishedAt: '',
    views: '110M views',
    likes: '5.5M',
    comments: '720K',
    rawViews: 110000000,
    language: 'Hindi',
    genre: ['Action', 'Adventure'],
    category: 'Bollywood',
    free: true,
    source: 'Fallback',
    trending: true,
    viral: true,
  },
  {
    id: 'sGbxmsDFVnE',
    videoId: 'sGbxmsDFVnE',
    title: 'Inception Full Movie',
    thumbnail: 'https://img.youtube.com/vi/YoHD9XEInc0/hqdefault.jpg',
    duration: '2h 28m',
    durationSec: 8880,
    channel: 'Warner Bros',
    channelId: '',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    publishedAt: '',
    views: '42M views',
    likes: '1.8M',
    comments: '260K',
    rawViews: 42000000,
    language: 'English',
    genre: ['Sci-Fi', 'Action'],
    category: 'Hollywood',
    free: true,
    source: 'Fallback',
    trending: false,
    viral: false,
  },
  {
    id: 'qvsgGtivCgs',
    videoId: 'qvsgGtivCgs',
    title: 'Attack on Titan Movie',
    thumbnail: 'https://img.youtube.com/vi/MGRm4IzK1dQ/hqdefault.jpg',
    duration: '1h 27m',
    durationSec: 5220,
    channel: 'Funimation',
    channelId: '',
    description: 'In a world where humanity lives within enormous walled cities to protect themselves from Titans, giant humanoid creatures, a young boy vows to exterminate them.',
    publishedAt: '',
    views: '18M views',
    likes: '890K',
    comments: '142K',
    rawViews: 18000000,
    language: 'Japanese',
    genre: ['Anime', 'Action'],
    category: 'Anime',
    free: true,
    source: 'Fallback',
    trending: true,
    viral: false,
  },
]

// ── Category filter helpers ──

export const getFallbackByCategory = (category: string): YouTubeMovie[] => {
  if (category === 'Trending')
    return FALLBACK_MOVIES.filter(m => m.trending)
  if (category === 'Anime')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Anime'))
  if (category === 'Korean')
    return FALLBACK_MOVIES.filter(m => m.category === 'Korean')
  if (category === 'Bollywood')
    return FALLBACK_MOVIES.filter(m => m.category === 'Bollywood')
  if (category === 'Hollywood')
    return FALLBACK_MOVIES.filter(m => m.category === 'Hollywood')
  if (category === 'Sci-Fi')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Sci-Fi'))
  if (category === 'Action')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Action'))
  if (category === 'Horror')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Horror'))
  if (category === 'Comedy')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Comedy'))
  if (category === 'Hindi Dubbed')
    return FALLBACK_MOVIES.filter(m => m.language === 'Hindi')
  if (category === 'Bangla')
    return FALLBACK_MOVIES.filter(m => m.language === 'Bangla')
  if (category === 'Adventure')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Adventure'))
  if (category === 'Drama')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Drama'))
  if (category === 'Thriller')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Thriller'))
  if (category === 'Romance')
    return FALLBACK_MOVIES.filter(m => m.genre?.includes('Romance'))
  return FALLBACK_MOVIES.slice(0, 8)
}

// ── Region filter helpers ──

export const getFallbackByRegion = (region: string): YouTubeMovie[] => {
  if (region === 'bangladesh')
    return FALLBACK_MOVIES.filter(m => m.language === 'Bangla' || m.language === 'Bengali')
  if (region === 'india')
    return FALLBACK_MOVIES.filter(m => m.language === 'Hindi' || m.language === 'Tamil' || m.language === 'Telugu')
  if (region === 'international')
    return FALLBACK_MOVIES.filter(m => m.language === 'English' || m.language === 'Korean' || m.language === 'Japanese')
  return FALLBACK_MOVIES.slice(0, 8)
}
