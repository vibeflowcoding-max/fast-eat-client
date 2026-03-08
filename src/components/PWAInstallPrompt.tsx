"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

const DISMISSED_KEY = 'fast-eat:pwa-install-dismissed';
const INSTALLED_KEY = 'fast-eat:pwa-installed';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function trackInstallEvent(action: string, detail?: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('fast-eat:pwa-install-event', {
      detail: {
        action,
        detail: detail || null,
        timestamp: new Date().toISOString(),
      },
    }),
  );
}

export default function PWAInstallPrompt() {
  const t = useTranslations('pwa.installPrompt');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const dismissedAt = window.localStorage.getItem(DISMISSED_KEY);
    const isInstalled = window.localStorage.getItem(INSTALLED_KEY) === 'true' || isStandaloneMode();

    if (isInstalled) {
      setIsVisible(false);
      return;
    }

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();

      if (dismissedAt) {
        return;
      }

      setDeferredPrompt(event);
      setErrorMessage(null);
      setIsVisible(true);

      if (!hasTrackedImpression.current) {
        trackInstallEvent('impression');
        hasTrackedImpression.current = true;
      }
    };

    const handleAppInstalled = () => {
      window.localStorage.setItem(INSTALLED_KEY, 'true');
      window.localStorage.removeItem(DISMISSED_KEY);
      setDeferredPrompt(null);
      setIsVisible(false);
      setErrorMessage(null);
      trackInstallEvent('conversion');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    }

    setIsVisible(false);
    setErrorMessage(null);
    trackInstallEvent('dismiss');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);
    setErrorMessage(null);
    trackInstallEvent('click');

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(INSTALLED_KEY, 'true');
          window.localStorage.removeItem(DISMISSED_KEY);
        }

        setIsVisible(false);
        trackInstallEvent('accepted', { platform: choice.platform });
      } else {
        setErrorMessage(t('browserDismissed'));
        setIsVisible(false);
        trackInstallEvent('browser-dismiss', { platform: choice.platform });
      }
    } catch {
      setErrorMessage(t('installError'));
      trackInstallEvent('error');
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  };

  if (!isVisible && !errorMessage) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.75rem] z-50 flex justify-center px-4 pb-safe sm:bottom-6">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[1.9rem] border border-[rgba(236,91,19,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,246,240,0.98)_100%)] shadow-[0_24px_70px_-34px_rgba(98,60,29,0.58)] backdrop-blur-2xl">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,var(--color-brand)_0%,#fb923c_100%)] text-white shadow-[0_16px_26px_-18px_rgba(236,91,19,0.75)]">
            <ArrowDownToLine size={20} strokeWidth={2.4} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-brand-strong)]">
              {t('eyebrow')}
            </p>
            <h2 className="mt-1 text-sm font-black text-[var(--color-text)] sm:text-base">
              {t('title')}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)] sm:text-sm">
              {t('description')}
            </p>
            {errorMessage ? (
              <p className="mt-2 text-xs font-semibold text-[var(--color-brand-strong)]" role="status" aria-live="polite">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleInstall}
                disabled={isInstalling || !deferredPrompt}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand)_0%,#fb923c_100%)] px-4 text-sm font-black text-white shadow-[0_18px_30px_-20px_rgba(236,91,19,0.85)] transition-transform duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isInstalling ? t('installing') : t('install')}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(98,60,29,0.12)] bg-white/80 px-4 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text)]"
              >
                {t('later')}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(98,60,29,0.08)] bg-white/78 text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-text)]"
            aria-label={t('dismiss')}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}