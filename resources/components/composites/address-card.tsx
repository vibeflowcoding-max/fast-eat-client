import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon } from "../primitives/icon";
import { Surface } from "../primitives/surface";
import { cn } from "../utils";

export type AddressCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  address: string;
  icon?: ReactNode;
  meta?: string;
  active?: boolean;
  trailing?: ReactNode;
};

export function AddressCard({
  className,
  title,
  address,
  icon,
  meta,
  active = false,
  trailing,
  type = "button",
  ...props
}: AddressCardProps) {
  return (
    <Surface
      asChild
      className={cn(
        "rounded-3xl p-0 ring-1 ring-transparent transition-colors",
        active && "ring-orange-300 dark:ring-orange-500/40",
      )}
      padding="none"
      variant="base"
    >
      <button
        className={cn(
          "flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-orange-50/40 dark:hover:bg-slate-800",
          className,
        )}
        type={type}
        {...props}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
          {icon ?? <Icon symbol="location_on" tone="brand" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{title}</span>
          <span className="mt-1 block break-words text-sm text-slate-500 dark:text-slate-400">{address}</span>
          {meta ? <span className="mt-1 block break-all text-xs text-slate-400 dark:text-slate-500">{meta}</span> : null}
        </span>
        <span className="shrink-0 text-slate-400">{trailing ?? <Icon symbol="chevron_right" tone="muted" />}</span>
      </button>
    </Surface>
  );
}