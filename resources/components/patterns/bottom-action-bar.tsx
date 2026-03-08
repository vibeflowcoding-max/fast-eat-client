import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

export type BottomActionBarProps = HTMLAttributes<HTMLDivElement> & {
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  meta?: ReactNode;
};

export function BottomActionBar({
  className,
  primaryAction,
  secondaryAction,
  meta,
  ...props
}: BottomActionBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-1/2 z-20 flex w-full max-w-[448px] -translate-x-1/2 flex-col gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
        className,
      )}
      {...props}
    >
      {meta ? <div className="text-sm text-slate-500 dark:text-slate-400">{meta}</div> : null}
      <div className="flex gap-3">
        {secondaryAction ? <div className="shrink-0">{secondaryAction}</div> : null}
        <div className="min-w-0 flex-1">{primaryAction}</div>
      </div>
    </div>
  );
}