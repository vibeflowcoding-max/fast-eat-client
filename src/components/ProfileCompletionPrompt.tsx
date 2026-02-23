"use client";

import { X } from 'lucide-react';

interface ProfileCompletionPromptProps {
  visible: boolean;
  onCompleteNow: () => void;
  onLater: () => void;
}

export default function ProfileCompletionPrompt({ visible, onCompleteNow, onLater }: ProfileCompletionPromptProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="mt-2 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label="Completa tu perfil"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
        <p className="text-xs font-semibold text-orange-800">Fill missing information for the best experience</p>
        <button
          type="button"
          onClick={onCompleteNow}
          className="text-[11px] font-semibold text-orange-600 underline hover:text-orange-800"
        >
          Complete now
        </button>
      </div>
      <button
        type="button"
        onClick={onLater}
        className="text-orange-400 hover:text-orange-600 p-1"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
