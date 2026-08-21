// ── Play Nexa — Video Filter Library ─────────────────────────────
// Filters RSS videos based on channel config keywords and builds
// database records for movies and music_tracks tables.
// Used by sync-channel API route and Edge Function.

import type { RSSVideo } from './rssParser'

// ── Default Keyword Lists ──────────────────────────────────────
// Used when a channel has no custom keywords configured.
// These cover the most common Bangla movie and music patterns.

const DEFAULT_MOVIE_INCLUDES = [
  'full movie', 'official movie', 'bangla movie',
  'bengali movie', 'full film', 'natok', 'telefilm',
  'web series', 'short film', 'documentary',
  'cinema', 'পূর্ণ চলচ্চিত্র', 'বাংলা সিনেমা',
]

const DEFAULT_MOVIE_EXCLUDES = [
  'trailer', 'teaser', 'song', 'making of',
  'interview', 'behind the scenes', 'promo',
  'preview', 'reaction', 'review', 'recap',
  'music video', 'lyric video', 'cover song',
  'gameplay', 'walkthrough', 'vlog', 'shorts',
]

const DEFAULT_MUSIC_INCLUDES = [
  'song', 'music', 'audio', 'ost', 'soundtrack',
  'lyric', 'cover', 'acoustic', 'remix', 'mashup',
  'official audio', 'music video', 'single',
  'গান', 'সঙ্গীত', 'বাংলা গান',
]

const DEFAULT_MUSIC_EXCLUDES = [
  'full movie', 'film', 'natok', 'telefilm',
  'documentary', 'interview', 'vlog', 'gameplay',
  'tutorial', 'review',
]

// ── Video Classification ───────────────────────────────────────
// Determines if a video matches movie or music criteria based on
// its title and description text. Returns true if the video
// passes the include/exclude keyword filters.

export function isMovieVideo(
  title: string,
  description: string,
  includeKeywords: string[] = [],
  excludeKeywords: string[] = []
): boolean {
  const text = `${title} ${description}`.toLowerCase()

  // Use channel-specific keywords, or fall back to defaults
  const includes = includeKeywords.length > 0
    ? includeKeywords
    : DEFAULT_MOVIE_INCLUDES
  const excludes = excludeKeywords.length > 0
    ? excludeKeywords
    : DEFAULT_MOVIE_EXCLUDES

  // Must match at least one include keyword
  const hasInclude = includes.some(k =>
    text.includes(k.toLowerCase()))

  // Must NOT match any exclude keyword
  const hasExclude = excludes.some(k =>
    text.includes(k.toLowerCase()))

  return hasInclude && !hasExclude
}

export function isMusicVideo(
  title: string,
  description: string,
  includeKeywords: string[] = [],
  excludeKeywords: string[] = []
): boolean {
  const text = `${title} ${description}`.toLowerCase()

  // Use channel-specific keywords, or fall back to defaults
  const includes = includeKeywords.length > 0
    ? includeKeywords
    : DEFAULT_MUSIC_INCLUDES
  const excludes = excludeKeywords.length > 0
    ? excludeKeywords
    : DEFAULT_MUSIC_EXCLUDES

  // Must match at least one include keyword
  const hasInclude = includes.some(k =>
    text.includes(k.toLowerCase()))

  // Must NOT match any exclude keyword
  const hasExclude = excludes.some(k =>
    text.includes(k.toLowerCase()))

  return hasInclude && !hasExclude
}

// ── Record Builders ────────────────────────────────────────────
// Build database-ready objects from RSSVideo data.
// These map RSS fields to the correct column names in Supabase.

export function buildMovieRecord(
  video: RSSVideo,
  channelDbId: string
) {
  return {
    youtube_id: video.videoId,
    title: video.title,
    thumbnail: video.thumbnail,
    channel_name: video.channelName,
    channel_id: video.channelId,
    description: video.description || '',
    published_at: video.publishedAt,
    view_count: video.viewCount || 0,
    source_channel_id: channelDbId,
    language: 'Bangla',
    is_hidden: false,
  }
}

export function buildMusicRecord(
  video: RSSVideo,
  channelDbId: string
) {
  return {
    youtube_id: video.videoId,
    title: video.title,
    thumbnail: video.thumbnail,
    channel_name: video.channelName,
    channel_id: video.channelId,
    description: video.description || '',
    published_at: video.publishedAt,
    view_count: video.viewCount || 0,
    source_channel_id: channelDbId,
    language: 'Bangla',
    is_hidden: false,
  }
}

// ── Channel Type Routing ───────────────────────────────────────
// Determines which tables a video should be inserted into based
// on the channel's type config and the video's classification.

export interface ClassificationResult {
  isMovie: boolean
  isMusic: boolean
}

export function classifyVideo(
  video: RSSVideo,
  channelType: 'movies' | 'music' | 'mixed',
  filterKeywords: string[] = [],
  excludeKeywords: string[] = []
): ClassificationResult {
  // For 'movies' channels, only check movie criteria
  if (channelType === 'movies') {
    return {
      isMovie: isMovieVideo(
        video.title, video.description,
        filterKeywords, excludeKeywords
      ),
      isMusic: false,
    }
  }

  // For 'music' channels, only check music criteria
  if (channelType === 'music') {
    return {
      isMovie: false,
      isMusic: isMusicVideo(
        video.title, video.description,
        filterKeywords, excludeKeywords
      ),
    }
  }

  // For 'mixed' channels, check both criteria independently
  return {
    isMovie: isMovieVideo(
      video.title, video.description,
      filterKeywords, excludeKeywords
    ),
    isMusic: isMusicVideo(
      video.title, video.description,
      filterKeywords, excludeKeywords
    ),
  }
}
