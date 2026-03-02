"use client";

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ProfileCompletionPromptProps {
  visible: boolean;
  onCompleteNow: () => void;
  onLater: () => void;
}

export default function ProfileCompletionPrompt({ visible, onCompleteNow, onLater }: ProfileCompletionPromptProps) {
  const t = useTranslations('checkout');

  if (!visible) {
    return null;
  }

  return (
    <div
      className="mt-2 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label={t('profilePromptLabel')}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
        <p className="text-xs font-semibold text-orange-800">{t('profilePromptText')}</p>
        <button
          type="button"
          onClick={onCompleteNow}
          className="text-[11px] font-semibold text-orange-600 underline hover:text-orange-800"
        >
          {t('profilePromptNow')}
        </button>
      </div>
      <button
        type="button"
        onClick={onLater}
        className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-white/70 text-orange-500 transition-colors hover:bg-white hover:text-orange-700"
        aria-label={t('dismiss')}
      >
        <X size={14} />
      </button>
    </div>
  );
}
