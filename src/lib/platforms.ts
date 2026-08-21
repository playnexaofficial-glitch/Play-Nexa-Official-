// ═══════════════════════════════════════════════════════════════
// Play Nexa — Smart Download Platform Data Library
// 21 Source Platforms + 30+ Download Platforms
// 100% hardcoded — zero API calls, works offline
// ═══════════════════════════════════════════════════════════════

export interface DownloadPlatform {
  id: string
  name: string
  logo: string
  logoBg?: string
  urlTemplate: string
  openUrl: string
  rating: number
  speed: 'super_fast' | 'fast' | 'medium' | 'slow'
  isFree: boolean
  features: string[]
  supports: string[]
  isRecommended: boolean
  isVerified: boolean
  category: 'universal' | 'youtube' | 'tiktok' |
    'instagram' | 'facebook' | 'twitter' |
    'music' | 'other'
}

export interface SourcePlatform {
  id: string
  name: string
  color: string
  gradient?: string
  emoji: string
  urlPatterns: RegExp[]
  videoIdPattern?: RegExp
  category: 'video' | 'music' | 'social' | 'regional'
}

// ── SOURCE PLATFORMS (what user downloads FROM) ──────────────
export const SOURCE_PLATFORMS: SourcePlatform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    emoji: '▶️',
    category: 'video',
    urlPatterns: [
      /youtube\.com\/watch/,
      /youtube\.com\/shorts/,
      /youtu\.be\//,
      /youtube\.com\/live/,
    ],
    videoIdPattern:
      /(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#FE2C55',
    emoji: '🎵',
    category: 'social',
    urlPatterns: [
      /tiktok\.com\/@/,
      /tiktok\.com\/t\//,
      /vm\.tiktok\.com/,
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    gradient: 'linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D)',
    emoji: '📸',
    category: 'social',
    urlPatterns: [
      /instagram\.com\/p\//,
      /instagram\.com\/reel/,
      /instagram\.com\/stories/,
      /instagram\.com\/tv\//,
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    emoji: '📘',
    category: 'social',
    urlPatterns: [
      /facebook\.com\/watch/,
      /fb\.watch\//,
      /facebook\.com\/reel/,
      /facebook\.com\/videos/,
      /facebook\.com\/share\/v/,
    ],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    color: '#1DA1F2',
    emoji: '🐦',
    category: 'social',
    urlPatterns: [
      /twitter\.com\/.*\/status/,
      /x\.com\/.*\/status/,
      /t\.co\//,
    ],
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    color: '#FFFC00',
    emoji: '👻',
    category: 'social',
    urlPatterns: [
      /snapchat\.com\/spotlight/,
      /snapchat\.com\/add/,
      /story\.snapchat\.com/,
    ],
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    color: '#1AB7EA',
    emoji: '🎬',
    category: 'video',
    urlPatterns: [
      /vimeo\.com\/\d+/,
      /player\.vimeo\.com/,
    ],
  },
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    color: '#00B4FF',
    emoji: '📺',
    category: 'video',
    urlPatterns: [
      /dailymotion\.com\/video/,
      /dai\.ly\//,
    ],
  },
  {
    id: 'twitch',
    name: 'Twitch',
    color: '#9146FF',
    emoji: '🎮',
    category: 'video',
    urlPatterns: [
      /twitch\.tv\/videos/,
      /twitch\.tv\/.*\/clip/,
      /clips\.twitch\.tv/,
    ],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    color: '#FF4500',
    emoji: '🤖',
    category: 'social',
    urlPatterns: [
      /reddit\.com\/r\/.*\/comments/,
      /v\.redd\.it\//,
      /redd\.it\//,
    ],
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    color: '#FF5500',
    emoji: '🎵',
    category: 'music',
    urlPatterns: [
      /soundcloud\.com\//,
      /snd\.sc\//,
    ],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    color: '#E60023',
    emoji: '📌',
    category: 'social',
    urlPatterns: [
      /pinterest\.com\/pin/,
      /pin\.it\//,
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    emoji: '💼',
    category: 'social',
    urlPatterns: [
      /linkedin\.com\/posts/,
      /linkedin\.com\/feed\/update/,
    ],
  },
  {
    id: 'likee',
    name: 'Likee',
    color: '#FF6B35',
    emoji: '❤️',
    category: 'regional',
    urlPatterns: [
      /likee\.video\//,
      /like\.video\//,
    ],
  },
  {
    id: 'sharechat',
    name: 'ShareChat',
    color: '#5C38D4',
    emoji: '💬',
    category: 'regional',
    urlPatterns: [
      /sharechat\.com\//,
      /b\.sharechat\.com/,
    ],
  },
  {
    id: 'moj',
    name: 'Moj',
    color: '#FF4455',
    emoji: '✨',
    category: 'regional',
    urlPatterns: [
      /mojapp\.in\//,
      /moj\.tv\//,
    ],
  },
  {
    id: 'josh',
    name: 'Josh',
    color: '#E31E52',
    emoji: '🎉',
    category: 'regional',
    urlPatterns: [
      /josh\.in\//,
      /share\.josh\.in/,
    ],
  },
  {
    id: 'mx_takatak',
    name: 'MX TakaTak',
    color: '#FF6B00',
    emoji: '🎶',
    category: 'regional',
    urlPatterns: [
      /mxtakatak\.com\//,
    ],
  },
  {
    id: 'chingari',
    name: 'Chingari',
    color: '#FF4500',
    emoji: '🔥',
    category: 'regional',
    urlPatterns: [
      /chingari\.io\//,
    ],
  },
  {
    id: 'bilibili',
    name: 'Bilibili',
    color: '#00A1D6',
    emoji: '📱',
    category: 'video',
    urlPatterns: [
      /bilibili\.com\/video/,
      /b23\.tv\//,
    ],
  },
  {
    id: 'niconico',
    name: 'NicoNico',
    color: '#252525',
    emoji: '🎌',
    category: 'video',
    urlPatterns: [
      /nicovideo\.jp\/watch/,
      /nico\.ms\//,
    ],
  },
]

// ── DOWNLOAD PLATFORMS (where user downloads TO) ─────────────
export const DOWNLOAD_PLATFORMS: DownloadPlatform[] = [

  // ═══ UNIVERSAL ═══
  {
    id: 'savefrom',
    name: 'SaveFrom.net',
    logo: 'https://www.google.com/s2/favicons?domain=savefrom.net&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://en.savefrom.net/#url={URL}',
    openUrl: 'https://en.savefrom.net',
    rating: 4.8,
    speed: 'super_fast',
    isFree: true,
    features: ['No watermark', '4K', 'MP3', 'Playlist', 'Subtitles'],
    supports: ['youtube', 'facebook', 'instagram', 'tiktok', 'vimeo', 'dailymotion', 'twitter', 'reddit'],
    isRecommended: true,
    isVerified: true,
    category: 'universal',
  },
  {
    id: 'y2mate',
    name: 'Y2Mate',
    logo: 'https://www.google.com/s2/favicons?domain=y2mate.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://www.y2mate.com/youtube/{VIDEO_ID}',
    openUrl: 'https://www.y2mate.com',
    rating: 4.5,
    speed: 'fast',
    isFree: true,
    features: ['4K', 'MP3', 'MP4', 'Playlist'],
    supports: ['youtube', 'facebook', 'tiktok'],
    isRecommended: true,
    isVerified: true,
    category: 'universal',
  },
  {
    id: '9xbuddy',
    name: '9xBuddy',
    logo: 'https://www.google.com/s2/favicons?domain=9xbuddy.in&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://9xbuddy.in/process?url={URL}',
    openUrl: 'https://9xbuddy.in',
    rating: 4.3,
    speed: 'fast',
    isFree: true,
    features: ['HD', 'MP3', 'Multi-platform'],
    supports: ['youtube', 'facebook', 'instagram', 'tiktok', 'twitter', 'vimeo'],
    isRecommended: false,
    isVerified: true,
    category: 'universal',
  },
  {
    id: 'snapsave',
    name: 'SnapSave',
    logo: 'https://www.google.com/s2/favicons?domain=snapsave.app&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://snapsave.app/?url={URL}',
    openUrl: 'https://snapsave.app',
    rating: 4.6,
    speed: 'super_fast',
    isFree: true,
    features: ['No watermark', 'HD', 'Story DL'],
    supports: ['instagram', 'facebook', 'tiktok'],
    isRecommended: true,
    isVerified: true,
    category: 'universal',
  },
  {
    id: 'loader',
    name: 'Loader.to',
    logo: 'https://www.google.com/s2/favicons?domain=loader.to&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://loader.to/api/button/?url={URL}',
    openUrl: 'https://loader.to',
    rating: 4.5,
    speed: 'fast',
    isFree: true,
    features: ['Playlist', '8K', 'MP3', 'MP4'],
    supports: ['youtube', 'vimeo', 'soundcloud', 'facebook'],
    isRecommended: false,
    isVerified: true,
    category: 'universal',
  },
  {
    id: 'cobalt',
    name: 'Cobalt.tools',
    logo: 'https://www.google.com/s2/favicons?domain=cobalt.tools&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://cobalt.tools/#url={URL}',
    openUrl: 'https://cobalt.tools',
    rating: 4.9,
    speed: 'super_fast',
    isFree: true,
    features: ['No ads', 'Clean UI', '4K', 'No watermark', 'Open source'],
    supports: ['youtube', 'tiktok', 'twitter', 'instagram', 'reddit', 'soundcloud', 'vimeo', 'twitch'],
    isRecommended: true,
    isVerified: true,
    category: 'universal',
  },

  // ═══ YOUTUBE SPECIFIC ═══
  {
    id: 'yt1s',
    name: 'YT1S',
    logo: 'https://www.google.com/s2/favicons?domain=yt1s.io&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://yt1s.io/api/ajaxSearch?q={URL}',
    openUrl: 'https://yt1s.io',
    rating: 4.4,
    speed: 'fast',
    isFree: true,
    features: ['4K', 'MP3', 'Fast'],
    supports: ['youtube'],
    isRecommended: false,
    isVerified: true,
    category: 'youtube',
  },
  {
    id: 'yt5s',
    name: 'YT5S',
    logo: 'https://www.google.com/s2/favicons?domain=yt5s.io&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://yt5s.io/?url={URL}',
    openUrl: 'https://yt5s.io',
    rating: 4.3,
    speed: 'fast',
    isFree: true,
    features: ['1080p', 'MP3', 'Free'],
    supports: ['youtube'],
    isRecommended: false,
    isVerified: true,
    category: 'youtube',
  },
  {
    id: 'bitdownloader',
    name: 'BitDownloader',
    logo: 'https://www.google.com/s2/favicons?domain=bitdownloader.io&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://bitdownloader.io/youtube-video-downloader?url={URL}',
    openUrl: 'https://bitdownloader.io',
    rating: 4.2,
    speed: 'fast',
    isFree: true,
    features: ['HD', 'MP3', 'Clean'],
    supports: ['youtube'],
    isRecommended: false,
    isVerified: true,
    category: 'youtube',
  },
  {
    id: 'clipconverter',
    name: 'ClipConverter',
    logo: 'https://www.google.com/s2/favicons?domain=clipconverter.cc&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://www.clipconverter.cc/2/?url={URL}',
    openUrl: 'https://www.clipconverter.cc',
    rating: 3.9,
    speed: 'medium',
    isFree: true,
    features: ['MP3', 'M4A', 'Convert'],
    supports: ['youtube', 'vimeo', 'dailymotion'],
    isRecommended: false,
    isVerified: false,
    category: 'youtube',
  },
  {
    id: 'ytsave',
    name: 'YTSave',
    logo: 'https://www.google.com/s2/favicons?domain=ytsave.net&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://ytsave.net/?url={URL}',
    openUrl: 'https://ytsave.net',
    rating: 4.1,
    speed: 'fast',
    isFree: true,
    features: ['HD', 'MP3', 'Simple UI'],
    supports: ['youtube'],
    isRecommended: false,
    isVerified: false,
    category: 'youtube',
  },

  // ═══ TIKTOK SPECIFIC ═══
  {
    id: 'ssstik',
    name: 'SSStiK',
    logo: 'https://www.google.com/s2/favicons?domain=ssstik.io&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://ssstik.io/en?url={URL}',
    openUrl: 'https://ssstik.io',
    rating: 4.7,
    speed: 'super_fast',
    isFree: true,
    features: ['No watermark', 'HD', 'MP3', 'Story', 'Slideshow'],
    supports: ['tiktok'],
    isRecommended: true,
    isVerified: true,
    category: 'tiktok',
  },
  {
    id: 'musicaldown',
    name: 'MusicalDown',
    logo: 'https://www.google.com/s2/favicons?domain=musicaldown.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://musicaldown.com/?url={URL}',
    openUrl: 'https://musicaldown.com',
    rating: 4.5,
    speed: 'fast',
    isFree: true,
    features: ['No watermark', 'HD', 'MP3'],
    supports: ['tiktok'],
    isRecommended: true,
    isVerified: true,
    category: 'tiktok',
  },
  {
    id: 'tikmate',
    name: 'TikMate',
    logo: 'https://www.google.com/s2/favicons?domain=tikmate.online&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://tikmate.online/?url={URL}',
    openUrl: 'https://tikmate.online',
    rating: 4.6,
    speed: 'fast',
    isFree: true,
    features: ['No watermark', 'HD'],
    supports: ['tiktok'],
    isRecommended: false,
    isVerified: true,
    category: 'tiktok',
  },
  {
    id: 'savetik',
    name: 'SaveTik',
    logo: 'https://www.google.com/s2/favicons?domain=savetik.net&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://savetik.net/?url={URL}',
    openUrl: 'https://savetik.net',
    rating: 4.3,
    speed: 'fast',
    isFree: true,
    features: ['No watermark', 'MP3'],
    supports: ['tiktok'],
    isRecommended: false,
    isVerified: false,
    category: 'tiktok',
  },
  {
    id: 'tiktokio',
    name: 'Tiktok.io',
    logo: 'https://www.google.com/s2/favicons?domain=tiktok.io&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://tiktok.io/?url={URL}',
    openUrl: 'https://tiktok.io',
    rating: 4.2,
    speed: 'medium',
    isFree: true,
    features: ['No watermark', 'Batch DL'],
    supports: ['tiktok'],
    isRecommended: false,
    isVerified: false,
    category: 'tiktok',
  },

  // ═══ INSTAGRAM SPECIFIC ═══
  {
    id: 'imginn',
    name: 'ImgInn',
    logo: 'https://www.google.com/s2/favicons?domain=imginn.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://imginn.com/p/{POST_ID}/',
    openUrl: 'https://imginn.com',
    rating: 4.7,
    speed: 'fast',
    isFree: true,
    features: ['Photo', 'Video', 'Story', 'Reel', 'IGTV'],
    supports: ['instagram'],
    isRecommended: true,
    isVerified: true,
    category: 'instagram',
  },
  {
    id: 'snapinsta',
    name: 'SnapInsta',
    logo: 'https://www.google.com/s2/favicons?domain=snapinsta.app&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://snapinsta.app/?url={URL}',
    openUrl: 'https://snapinsta.app',
    rating: 4.5,
    speed: 'fast',
    isFree: true,
    features: ['Reel', 'Story', 'Photo', 'HD'],
    supports: ['instagram', 'tiktok'],
    isRecommended: true,
    isVerified: true,
    category: 'instagram',
  },
  {
    id: 'downloadgram',
    name: 'DownloadGram',
    logo: 'https://www.google.com/s2/favicons?domain=downloadgram.org&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://downloadgram.org/?url={URL}',
    openUrl: 'https://downloadgram.org',
    rating: 4.2,
    speed: 'medium',
    isFree: true,
    features: ['Photo', 'Video', 'Story'],
    supports: ['instagram'],
    isRecommended: false,
    isVerified: true,
    category: 'instagram',
  },
  {
    id: 'instafinsta',
    name: 'InstaFinsta',
    logo: 'https://www.google.com/s2/favicons?domain=instafinsta.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://instafinsta.com/?url={URL}',
    openUrl: 'https://instafinsta.com',
    rating: 4.1,
    speed: 'medium',
    isFree: true,
    features: ['Reel', 'Story', 'Post'],
    supports: ['instagram'],
    isRecommended: false,
    isVerified: false,
    category: 'instagram',
  },

  // ═══ FACEBOOK SPECIFIC ═══
  {
    id: 'fbdown',
    name: 'FBDown.net',
    logo: 'https://www.google.com/s2/favicons?domain=fbdown.net&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://fbdown.net/?url={URL}',
    openUrl: 'https://fbdown.net',
    rating: 4.5,
    speed: 'fast',
    isFree: true,
    features: ['HD', 'SD', 'Reel', 'Story'],
    supports: ['facebook'],
    isRecommended: true,
    isVerified: true,
    category: 'facebook',
  },
  {
    id: 'getfvid',
    name: 'GetFVid',
    logo: 'https://www.google.com/s2/favicons?domain=getfvid.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://www.getfvid.com/?url={URL}',
    openUrl: 'https://www.getfvid.com',
    rating: 4.3,
    speed: 'fast',
    isFree: true,
    features: ['HD', 'SD', 'Fast'],
    supports: ['facebook'],
    isRecommended: false,
    isVerified: true,
    category: 'facebook',
  },
  {
    id: 'fdown',
    name: 'Fdown.net',
    logo: 'https://www.google.com/s2/favicons?domain=fdown.net&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://fdown.net/?url={URL}',
    openUrl: 'https://fdown.net',
    rating: 4.0,
    speed: 'medium',
    isFree: true,
    features: ['HD', 'SD'],
    supports: ['facebook'],
    isRecommended: false,
    isVerified: false,
    category: 'facebook',
  },

  // ═══ TWITTER/X SPECIFIC ═══
  {
    id: 'ssstwitter',
    name: 'SSSTwitter',
    logo: 'https://www.google.com/s2/favicons?domain=ssstwitter.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://ssstwitter.com/?url={URL}',
    openUrl: 'https://ssstwitter.com',
    rating: 4.6,
    speed: 'super_fast',
    isFree: true,
    features: ['HD', 'GIF', 'Fast', 'Simple'],
    supports: ['twitter'],
    isRecommended: true,
    isVerified: true,
    category: 'twitter',
  },
  {
    id: 'twitterviddownloader',
    name: 'TwitterVidDownloader',
    logo: 'https://www.google.com/s2/favicons?domain=twittervideodownloader.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://twittervideodownloader.com/?url={URL}',
    openUrl: 'https://twittervideodownloader.com',
    rating: 4.4,
    speed: 'fast',
    isFree: true,
    features: ['HD', 'GIF', 'MP4'],
    supports: ['twitter'],
    isRecommended: false,
    isVerified: true,
    category: 'twitter',
  },
  {
    id: 'twdownload',
    name: 'TWDownload',
    logo: 'https://www.google.com/s2/favicons?domain=twdownload.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://twdownload.com/?url={URL}',
    openUrl: 'https://twdownload.com',
    rating: 4.2,
    speed: 'fast',
    isFree: true,
    features: ['HD', 'GIF'],
    supports: ['twitter'],
    isRecommended: false,
    isVerified: false,
    category: 'twitter',
  },

  // ═══ MUSIC SPECIFIC ═══
  {
    id: 'soundcloudmp3',
    name: 'SoundCloudMP3',
    logo: 'https://www.google.com/s2/favicons?domain=soundcloudmp3.org&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://soundcloudmp3.org/?url={URL}',
    openUrl: 'https://soundcloudmp3.org',
    rating: 4.5,
    speed: 'fast',
    isFree: true,
    features: ['MP3', 'WAV', 'High quality'],
    supports: ['soundcloud'],
    isRecommended: true,
    isVerified: true,
    category: 'music',
  },
  {
    id: 'klickaud',
    name: 'KlickAud',
    logo: 'https://www.google.com/s2/favicons?domain=klickaud.co&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://klickaud.co/?url={URL}',
    openUrl: 'https://klickaud.co',
    rating: 4.3,
    speed: 'fast',
    isFree: true,
    features: ['MP3', '320kbps', 'Cover art'],
    supports: ['soundcloud'],
    isRecommended: false,
    isVerified: true,
    category: 'music',
  },

  // ═══ REDDIT SPECIFIC ═══
  {
    id: 'redditsave',
    name: 'RedditSave',
    logo: 'https://www.google.com/s2/favicons?domain=redditsave.com&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://redditsave.com/?url={URL}',
    openUrl: 'https://redditsave.com',
    rating: 4.4,
    speed: 'fast',
    isFree: true,
    features: ['HD', 'GIF', 'Audio merge'],
    supports: ['reddit'],
    isRecommended: true,
    isVerified: true,
    category: 'other',
  },
  {
    id: 'redditdownloader',
    name: 'Reddit.Tube',
    logo: 'https://www.google.com/s2/favicons?domain=reddit.tube&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://reddit.tube/?url={URL}',
    openUrl: 'https://reddit.tube',
    rating: 4.2,
    speed: 'medium',
    isFree: true,
    features: ['HD', 'GIF', 'Free'],
    supports: ['reddit'],
    isRecommended: false,
    isVerified: false,
    category: 'other',
  },

  // ═══ VIMEO ═══
  {
    id: 'vimeodownloader',
    name: 'VimeoDownloader',
    logo: 'https://www.google.com/s2/favicons?domain=vimeodownloader.net&sz=64',
    logoBg: '#1A1A2E',
    urlTemplate: 'https://vimeodownloader.net/?url={URL}',
    openUrl: 'https://vimeodownloader.net',
    rating: 4.3,
    speed: 'fast',
    isFree: true,
    features: ['4K', 'HD', 'MP4'],
    supports: ['vimeo'],
    isRecommended: true,
    isVerified: true,
    category: 'other',
  },
]

// ── HELPER FUNCTIONS ─────────────────────────────────────────

/** Get download platforms that support a given source, sorted: recommended first, then by rating */
export const getPlatformsForSource = (
  sourceId: string
): DownloadPlatform[] => {
  return DOWNLOAD_PLATFORMS
    .filter(p => p.supports.includes(sourceId))
    .sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1
      if (!a.isRecommended && b.isRecommended) return 1
      return b.rating - a.rating
    })
}

/** Build the download URL by replacing {URL}, {VIDEO_ID}, {POST_ID} placeholders */
export const buildDownloadUrl = (
  platform: DownloadPlatform,
  videoUrl: string,
  videoId?: string
): string => {
  let url = platform.urlTemplate
  url = url.replace('{URL}', encodeURIComponent(videoUrl))
  if (videoId) {
    url = url.replace('{VIDEO_ID}', videoId)
    url = url.replace('{POST_ID}', videoId)
  }
  return url
}

/** Get human-readable speed label */
export const getSpeedLabel = (
  speed: DownloadPlatform['speed']
): string => {
  const labels: Record<DownloadPlatform['speed'], string> = {
    super_fast: 'Super Fast',
    fast: 'Fast',
    medium: 'Medium',
    slow: 'Slow',
  }
  return labels[speed]
}

/** Get speed color for badge styling */
export const getSpeedColor = (
  speed: DownloadPlatform['speed']
): string => {
  const colors: Record<DownloadPlatform['speed'], string> = {
    super_fast: '#7C3AED',
    fast: '#22C55E',
    medium: '#F59E0B',
    slow: '#EF4444',
  }
  return colors[speed]
}

/** Get speed icon emoji */
export const getSpeedIcon = (
  speed: DownloadPlatform['speed']
): string => {
  const icons: Record<DownloadPlatform['speed'], string> = {
    super_fast: '⚡',
    fast: '🟢',
    medium: '🟡',
    slow: '🔴',
  }
  return icons[speed]
}
