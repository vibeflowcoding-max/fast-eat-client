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
  variant?: 'default' | 'tray';
};

export default function NotificationListItem({
  item,
  onClick,
  compact = false,
  timestampClassName,
  variant = 'default',
}: NotificationListItemProps) {
  const interactive = typeof onClick === 'function';
  const isTrayVariant = variant === 'tray';
  const containerClassName = cn(
    'w-full overflow-hidden transition-colors',
    isTrayVariant
      ? item.read
        ? 'rounded-[1.55rem] border border-[#ecd8ca] bg-[#fffdfb] shadow-[0_18px_40px_-32px_rgba(98,60,29,0.18)] dark:border-[#5a3726] dark:bg-[#34231a]'
        : 'rounded-[1.55rem] border border-[#f3d2bc] bg-white shadow-[0_18px_40px_-32px_rgba(98,60,29,0.26)] dark:border-[#5a3726] dark:bg-[#34231a]'
      : 'rounded-[1.75rem] border border-orange-200/80 shadow-[0_18px_36px_-30px_rgba(98,60,29,0.24)]',
    !isTrayVariant && item.accentClassName,
    isTrayVariant
      ? compact
        ? 'px-3.5 py-3.5'
        : 'px-4 py-4'
      : compact
        ? 'px-3 py-2.5'
        : 'px-4 py-3.5',
  );
  const timestampTone = timestampClassName ?? (compact
    ? 'text-[11px] font-black uppercase tracking-[0.08em] text-orange-500 dark:text-orange-300'
    : 'text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500');

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={item.title}
        className={cn(containerClassName, 'block text-left')}
      >
        <div className={cn(
          'grid',
          isTrayVariant
            ? 'grid-cols-[3.25rem_minmax(0,1fr)_3.9rem] items-start gap-x-3'
            : compact
              ? 'grid-cols-[3rem_minmax(0,1fr)_3.4rem] items-start gap-x-3'
              : 'grid-cols-[3.15rem_minmax(0,1fr)_3.6rem] items-start gap-x-3.5',
        )}>
          <div className={cn(
            'flex shrink-0 items-start justify-center',
            isTrayVariant
              ? 'pt-1'
              : compact
                ? 'pt-1'
                : 'pt-0.5',
          )}>
            <div className={cn(
              'flex items-center justify-center rounded-[1.05rem] border',
              isTrayVariant ? 'h-11 w-11' : compact ? 'h-10 w-10' : 'h-11 w-11',
              item.read
                ? 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                : 'border-orange-200 bg-orange-600 text-white shadow-[0_14px_30px_-20px_rgba(236,91,19,0.9)]',
            )}>
              <Icon symbol={item.iconSymbol} tone={item.read ? 'muted' : 'inverse'} />
            </div>
          </div>
          <div className={cn('min-w-0 pr-1', isTrayVariant ? 'self-start pt-0.5' : 'self-start')}>
            <p className={cn(
              'font-black tracking-[-0.02em] text-slate-900 dark:text-slate-100',
              isTrayVariant ? 'text-[0.97rem] leading-[1.3rem]' : 'text-[0.98rem] leading-5',
            )}>{item.title}</p>
            <p className={cn(
              'mt-1 break-words text-slate-600 dark:text-slate-300',
              isTrayVariant
                ? 'text-[0.94rem] leading-[1.45rem]'
                : compact
                  ? 'line-clamp-2 text-sm leading-[1.35rem]'
                  : 'text-sm leading-[1.45rem]',
            )}>
              {item.body}
            </p>
          </div>
          <div className={cn(
            'flex flex-col items-end self-stretch',
            isTrayVariant ? 'justify-between py-0.5' : 'justify-between py-1',
            isTrayVariant ? 'w-[3.9rem]' : compact ? 'w-[3.4rem]' : 'w-[3.6rem]',
          )}>
            <span className={cn('whitespace-nowrap text-right', timestampTone)}>{item.timestampLabel}</span>
            <ChevronRight className={cn('text-slate-400', isTrayVariant ? 'mt-4 h-4 w-4' : 'h-4 w-4')} />
          </div>
        </div>
      </button>
    );
  }

  return (
    <Surface
      className={containerClassName}
      variant={isTrayVariant ? 'base' : item.read ? 'muted' : 'base'}
    >
      <div className="grid grid-cols-[3.15rem_minmax(0,1fr)_3.6rem] items-start gap-x-3.5">
        <div className="flex shrink-0 items-start justify-center pt-0.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1.05rem] border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Icon symbol={item.iconSymbol} tone="muted" />
          </div>
        </div>
        <div className="min-w-0 pr-1">
          <p className="text-[0.98rem] font-black leading-5 tracking-[-0.02em] text-slate-900 dark:text-slate-100">{item.title}</p>
          <p className="mt-1 break-words text-sm leading-[1.45rem] text-slate-600 dark:text-slate-300">{item.body}</p>
        </div>
        <div className="flex self-stretch flex-col items-end justify-between py-1">
          <span className={cn('whitespace-nowrap text-right', timestampTone)}>{item.timestampLabel}</span>
        </div>
      </div>
    </Surface>
  );
}