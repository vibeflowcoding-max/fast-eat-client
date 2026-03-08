import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "../primitives/button";
import { cn } from "../utils";

export type StickyHeaderBarProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  subtitle?: string;
  leadingAction?: ReactNode;
  trailingAction?: ReactNode;
  sticky?: boolean;
};

export function StickyHeaderBar({
  className,
  title,
  subtitle,
  leadingAction,
  trailingAction,
  sticky = true,
  ...props
}: StickyHeaderBarProps) {
  return (
    <div
      className={cn(
        "z-10 flex min-h-16 items-center gap-3 border-b border-slate-200/80 bg-[#f8f6f2]/90 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-[#221610]/90",
        sticky && "sticky top-0",
        className,
      )}
      {...props}
    >
      <div className="shrink-0">{leadingAction ?? <Button size="icon" variant="ghost">←</Button>}</div>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="shrink-0">{trailingAction ?? <span className="block size-11" />}</div>
    </div>
  );
}