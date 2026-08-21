'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex items-center justify-center w-12 h-12 mb-4">
        <Icon className="w-12 h-12 text-pn-muted" />
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-pn-muted text-sm max-w-xs leading-relaxed mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="h-12 px-6 rounded-xl bg-pn-purple text-white font-medium text-sm transition-colors duration-150 hover:bg-pn-purple/90 active:scale-[0.97]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
