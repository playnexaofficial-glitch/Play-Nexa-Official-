'use client';

import { Download } from 'lucide-react';

interface DownloadButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  label?: string;
}

export default function DownloadButton({
  onClick,
  loading,
  disabled = false,
  label = 'Download',
}: DownloadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full h-14
        bg-pn-purple
        rounded-xl
        text-white font-semibold text-base
        flex items-center justify-center gap-2
        transition-transform duration-150
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97] cursor-pointer'}
      `}
    >
      {loading ? (
        <span className="download-spinner w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
      ) : (
        <Download className="w-5 h-5" />
      )}
      {loading ? 'Processing...' : label}
    </button>
  );
}
