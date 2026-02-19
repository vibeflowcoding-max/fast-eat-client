"use client";

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
      className="mt-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label="Completa tu perfil"
    >
      <p className="text-xs font-semibold text-orange-800">Fill missing information for the best experience</p>
      <p className="mt-1 text-[11px] text-orange-700">Add your profile and address for faster delivery</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onCompleteNow}
          className="rounded-md bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white"
        >
          Complete now
        </button>
        <button
          type="button"
          onClick={onLater}
          className="rounded-md border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-medium text-orange-700"
        >
          Later
        </button>
      </div>
    </div>
  );
}
