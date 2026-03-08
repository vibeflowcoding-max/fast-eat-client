import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

export type FixedBottomBarProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  summary?: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
};

export function FixedBottomBar({
  className,
  title,
  summary,
  primaryAction,
  secondaryAction,
  ...props
}: FixedBottomBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-1/2 z-20 flex w-full max-w-[448px] -translate-x-1/2 items-end gap-3 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {title ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p> : null}
        {summary ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{summary}</div> : null}
      </div>
      {secondaryAction ? <div className="shrink-0">{secondaryAction}</div> : null}
      <div className="shrink-0">{primaryAction}</div>
    </div>
  );
}