'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Leaving Play Nexa',
  message = 'You are about to open an external platform. Play Nexa is not responsible for external content.',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        className="bg-pn-card border border-pn-border rounded-2xl p-6 max-w-sm w-full animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/10">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 id="confirm-modal-title" className="text-white font-bold text-lg">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-pn-muted hover:text-white hover:bg-pn-secondary transition-colors duration-150"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <p id="confirm-modal-desc" className="text-pn-muted text-sm mb-6 leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-pn-secondary text-white font-medium text-sm transition-colors duration-150 hover:bg-pn-secondary/80 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-12 rounded-xl bg-pn-purple text-white font-medium text-sm transition-colors duration-150 hover:bg-pn-purple/90 active:scale-[0.97]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
