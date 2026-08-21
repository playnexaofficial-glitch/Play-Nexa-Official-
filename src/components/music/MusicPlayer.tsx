'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Music, Heart, MoreHorizontal, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat } from 'lucide-react';

interface MusicPlayerProps {
  title: string;
  artist: string;
  thumbnail?: string;
  duration: string;
}

export default function MusicPlayer({
  title,
  artist,
  thumbnail,
  duration,
}: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const toggleLike = useCallback(() => {
    setIsLiked((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setIsRepeat((prev) => !prev);
  }, []);

  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setProgress(Number(e.target.value));
    },
    []
  );

  const totalSeconds = duration
    .split(':')
    .reduce((acc, part) => acc * 60 + Number(part), 0);
  const currentSeconds = Math.floor((progress / 100) * totalSeconds);
  const currentMinutes = Math.floor(currentSeconds / 60);
  const currentSecs = currentSeconds % 60;
  const currentTimeStr = `${currentMinutes}:${currentSecs.toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      {/* Album Art */}
      <div
        className={`relative w-[200px] h-[200px] rounded-full bg-pn-card border-2 border-pn-purple overflow-hidden ${
          isPlaying ? 'animate-spin-slow' : ''
        }`}
        style={isPlaying ? undefined : { animationPlayState: 'paused' }}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={`${title} album art`}
            fill
            className="object-cover"
            sizes="200px"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <Music className="w-16 h-16 text-pn-purple" />
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="w-full text-center">
        <h2 className="text-white font-bold text-xl truncate">{title}</h2>
        <p className="text-pn-muted text-sm mt-0.5 truncate">{artist}</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={toggleLike}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors duration-150 ${
              isLiked ? 'text-red-500' : 'text-pn-muted hover:text-white'
            }`}
            aria-label={isLiked ? 'Unlike song' : 'Like song'}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-pn-muted hover:text-white transition-colors duration-150"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full px-2">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={handleProgressChange}
          className="w-full h-1 rounded-full appearance-none cursor-pointer accent-pn-purple bg-pn-border"
          aria-label="Song progress"
        />
        <div className="flex justify-between mt-1">
          <span className="text-pn-muted text-[10px]">{currentTimeStr}</span>
          <span className="text-pn-muted text-[10px]">{duration}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          className="min-h-[48px] min-w-[48px] flex items-center justify-center text-pn-muted hover:text-white transition-colors duration-150"
          aria-label="Previous track"
        >
          <SkipBack className="w-6 h-6" />
        </button>
        <button
          onClick={togglePlay}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center bg-pn-purple text-white rounded-full transition-colors duration-150 hover:bg-pn-purple/90"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>
        <button
          className="min-h-[48px] min-w-[48px] flex items-center justify-center text-pn-muted hover:text-white transition-colors duration-150"
          aria-label="Next track"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>

      {/* Shuffle + Repeat Toggles */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={toggleShuffle}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors duration-150 ${
            isShuffle
              ? 'text-pn-purple bg-pn-purple/10'
              : 'text-pn-muted hover:text-white'
          }`}
          aria-label="Shuffle"
          aria-pressed={isShuffle}
        >
          <Shuffle className="w-4 h-4" />
        </button>
        <button
          onClick={toggleRepeat}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors duration-150 ${
            isRepeat
              ? 'text-pn-purple bg-pn-purple/10'
              : 'text-pn-muted hover:text-white'
          }`}
          aria-label="Repeat"
          aria-pressed={isRepeat}
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Coming Soon Badge */}
      <span className="inline-flex items-center gap-1 bg-pn-secondary border border-pn-border text-pn-muted text-[10px] font-semibold rounded-full px-2.5 py-1">
        🎧 Coming Soon
      </span>
    </div>
  );
}
