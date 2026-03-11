"use client";

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Icon, Surface, cn } from '@/../resources/components';
import type { AppNotificationItem } from '@/features/notifications/notifications-model';

type NotificationListItemProps = {
  item: AppNotificationItem;
  onClick?: () => void;
  compact?: boolean;
  timestampClassName?: string;
};

export default function NotificationListItem({
  item,
  onClick,
  compact = false,
  timestampClassName,
}: NotificationListItemProps) {
  const interactive = typeof onClick === 'function';
  const timestampTone = timestampClassName ?? (compact
    ? 'text-[11px] font-black uppercase tracking-[0.08em] text-orange-500 dark:text-orange-300'
    : 'text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500');

  return (
    <Surface
      asChild={interactive}
      className={cn(
        'overflow-hidden rounded-[1.75rem] border border-orange-200/80 shadow-[0_18px_36px_-30px_rgba(98,60,29,0.24)] transition-colors',
        item.accentClassName,
        compact ? 'px-3.5 py-3' : 'px-4 py-3.5',
      )}
      variant={item.read ? 'muted' : 'base'}
    >
      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={item.title}
          className="block w-full text-left"
        >
          <div className={cn('grid items-start', compact ? 'grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3' : 'grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5')}>
            <div className={cn(
              compact ? 'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]' : 'mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.05rem]',
              item.read ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300' : 'bg-orange-600 text-white shadow-[0_14px_30px_-20px_rgba(236,91,19,0.9)]',
            )}>
              <Icon symbol={item.iconSymbol} tone={item.read ? 'muted' : 'inverse'} />
            </div>
            <div className="min-w-0 pr-1">
              <p className="text-[0.98rem] font-black leading-5 tracking-[-0.02em] text-slate-900 dark:text-slate-100">{item.title}</p>
              <p className={cn('mt-1 break-words text-slate-600 dark:text-slate-300', compact ? 'line-clamp-2 text-sm leading-[1.35rem]' : 'text-sm leading-[1.45rem]')}>
                {item.body}
              </p>
            </div>
            <div className={cn('flex self-stretch flex-col items-end justify-between', compact ? 'w-[3.4rem]' : 'w-[3.6rem]')}>
              <span className={cn('whitespace-nowrap text-right', timestampTone)}>{item.timestampLabel}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </button>
      ) : (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5">
          <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.05rem] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <Icon symbol={item.iconSymbol} tone="muted" />
          </div>
          <div className="min-w-0 pr-1">
            <p className="text-[0.98rem] font-black leading-5 tracking-[-0.02em] text-slate-900 dark:text-slate-100">{item.title}</p>
            <p className="mt-1 break-words text-sm leading-[1.45rem] text-slate-600 dark:text-slate-300">{item.body}</p>
          </div>
          <div className="flex self-stretch flex-col items-end justify-between">
            <span className={cn('whitespace-nowrap text-right', timestampTone)}>{item.timestampLabel}</span>
          </div>
        </div>
      )}
    </Surface>
  );
}