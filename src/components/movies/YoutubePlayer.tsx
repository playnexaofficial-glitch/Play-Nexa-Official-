'use client';

interface YoutubePlayerProps {
  videoId: string;
  title?: string;
}

export default function YoutubePlayer({ videoId, title }: YoutubePlayerProps) {
  return (
    <div className="relative w-full aspect-video bg-black rounded-b-2xl overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        loading="lazy"
        allow="autoplay; fullscreen"
        title={title || 'YouTube video player'}
      />
    </div>
  );
}
