"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/store';
import { Button } from '@/../resources/components';
import OrderNotificationsTray from './OrderNotificationsTray';

interface NotificationTrayTriggerProps {
  onOpenTracking: () => void;
  analyticsSource: string;
  className?: string;
  buttonClassName?: string;
  badgeClassName?: string;
  iconClassName?: string;
  size?: 'icon' | 'sm';
}

export default function NotificationTrayTrigger({
  onOpenTracking,
  analyticsSource,
  className,
  buttonClassName,
  badgeClassName,
  iconClassName,
  size = 'icon',
}: NotificationTrayTriggerProps) {
  const t = useTranslations('nav');
  const bidNotifications = useCartStore((state) => state.bidNotifications);
  const unreadCount = useMemo(
    () => bidNotifications.filter((notification) => !notification.read).length,
    [bidNotifications],
  );

  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [trayStyle, setTrayStyle] = useState<{ top: number; left: number; width: number; centered: boolean } | null>(null);
  const trayContainerRef = useRef<HTMLDivElement | null>(null);
  const trayTriggerRef = useRef<HTMLDivElement | null>(null);
  const trayRestoreFocusRef = useRef(false);

  useEffect(() => {
    if (!isTrayOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) {
        return;
      }

      if (trayContainerRef.current?.contains(targetNode) || trayTriggerRef.current?.contains(targetNode)) {
        return;
      }

      setIsTrayOpen(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fast-eat:notifications_tray_dismissed', {
          detail: { source: 'outside_click' },
        }));
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTrayOpen(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fast-eat:notifications_tray_dismissed', {
            detail: { source: 'escape_key' },
          }));
        }
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTrayOpen]);

  useEffect(() => {
    if (!isTrayOpen) {
      if (trayRestoreFocusRef.current) {
        trayTriggerRef.current?.querySelector<HTMLElement>('button')?.focus();
        trayRestoreFocusRef.current = false;
      }
      return;
    }

    trayRestoreFocusRef.current = true;

    const focusTray = window.requestAnimationFrame(() => {
      trayContainerRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusTray);
    };
  }, [isTrayOpen]);

  useEffect(() => {
    if (!isTrayOpen) {
      setTrayStyle(null);
      return;
    }

    const updateTrayPosition = () => {
      const trigger = trayTriggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const horizontalPadding = 16;
      const trayWidth = Math.min(360, viewportWidth - horizontalPadding * 2);
      const isMobileViewport = viewportWidth < 768;
      const centeredLeft = Math.max(horizontalPadding, Math.round((viewportWidth - trayWidth) / 2));
      const anchoredLeft = Math.min(
        Math.max(horizontalPadding, Math.round(rect.right - trayWidth)),
        Math.max(horizontalPadding, viewportWidth - trayWidth - horizontalPadding),
      );
      const centeredTop = Math.round(viewportHeight / 2);
      const anchoredTop = Math.round(Math.min(rect.bottom + 12, viewportHeight - 24));

      setTrayStyle({
        top: isMobileViewport ? centeredTop : anchoredTop,
        left: isMobileViewport ? centeredLeft : anchoredLeft,
        width: trayWidth,
        centered: isMobileViewport,
      });
    };

    updateTrayPosition();

    window.addEventListener('resize', updateTrayPosition);
    window.addEventListener('scroll', updateTrayPosition, true);

    return () => {
      window.removeEventListener('resize', updateTrayPosition);
      window.removeEventListener('scroll', updateTrayPosition, true);
    };
  }, [isTrayOpen]);

  return (
    <div ref={trayTriggerRef} className={className}>
      <Button
        className={buttonClassName}
        onClick={() => {
          setIsTrayOpen((current) => {
            const next = !current;

            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent(next ? 'fast-eat:notifications_tray_impression' : 'fast-eat:notifications_tray_dismissed', {
                detail: { source: analyticsSource },
              }));
            }

            return next;
          });
        }}
        aria-label={t('openOfferNotifications')}
        size={size}
        variant="outline"
      >
        <Bell className={iconClassName} strokeWidth={2.5} fill="currentColor" />
        {unreadCount > 0 && (
          <span className={badgeClassName}>
            {unreadCount}
          </span>
        )}
      </Button>
      {isTrayOpen && trayStyle && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[110] bg-[#221610]/42 backdrop-blur-[3px]"
                aria-hidden="true"
              />
              <div
                ref={trayContainerRef}
                className={`fixed z-[120] ${trayStyle.centered ? '-translate-y-1/2' : ''}`}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={t('openOfferNotifications')}
                style={{
                  top: `${trayStyle.top}px`,
                  left: `${trayStyle.left}px`,
                  width: `${trayStyle.width}px`,
                }}
              >
                <OrderNotificationsTray
                  onOpenTracking={() => {
                    onOpenTracking();
                    setIsTrayOpen(false);
                  }}
                  onClose={() => setIsTrayOpen(false)}
                />
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}