"use client";

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Icon, Surface, cn } from '@/../resources/components';
import type { AppNotificationItem } from '@/features/notifications/notifications-model';

type NotificationListItemProps = {
  item: AppNotificationItem;
  onClick?: () => void;
  compact?: boolean;
};

export default function NotificationListItem({ item, onClick, compact = false }: NotificationListItemProps) {
  const interactive = typeof onClick === 'function';

  return (
    <Surface
      asChild={interactive}
      className={cn(
        'rounded-[1.7rem] border border-orange-100/70 shadow-[0_18px_36px_-28px_rgba(98,60,29,0.35)] transition-colors',
        item.accentClassName,
        compact ? 'px-4 py-4' : 'px-4 py-4 sm:px-5 sm:py-5',
      )}
      variant={item.read ? 'muted' : 'base'}
    >
      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={item.title}
          className="w-full text-left"
        >
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem]',
              item.read ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300' : 'bg-orange-600 text-white shadow-[0_14px_30px_-20px_rgba(236,91,19,0.9)]',
            )}>
              <Icon symbol={item.iconSymbol} tone={item.read ? 'muted' : 'inverse'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black tracking-[-0.01em] text-slate-900 dark:text-slate-100">{item.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-orange-500 dark:text-orange-300">{item.timestampLabel}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </button>
      ) : (
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <Icon symbol={item.iconSymbol} tone="muted" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black tracking-[-0.01em] text-slate-900 dark:text-slate-100">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.body}</p>
              </div>
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">{item.timestampLabel}</span>
            </div>
          </div>
        </div>
      )}
    </Surface>
  );
}