import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

export type HeaderNavigationItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  badge?: ReactNode;
};

export type HeaderNavigationProps = HTMLAttributes<HTMLDivElement> & {
  items: HeaderNavigationItem[];
};

export function HeaderNavigation({ className, items, ...props }: HeaderNavigationProps) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-1/2 z-20 flex w-full max-w-[448px] -translate-x-1/2 items-center justify-around border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
        className,
      )}
      {...props}
    >
      {items.map((item) => (
        <button key={item.key} className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1" type="button">
          <span className="relative inline-flex">
            <span className={cn(item.active ? "text-orange-600 dark:text-orange-300" : "text-slate-400 dark:text-slate-500")}>{item.icon}</span>
            {item.badge ? <span className="absolute -right-2 -top-1">{item.badge}</span> : null}
          </span>
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", item.active ? "text-orange-600 dark:text-orange-300" : "text-slate-400 dark:text-slate-500")}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}