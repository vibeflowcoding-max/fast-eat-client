import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "../primitives/button";
import { Icon } from "../primitives/icon";
import { cn } from "../utils";

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  action?: ReactNode;
};

export function EmptyState({
  className,
  title,
  description,
  icon,
  actionLabel = "Explore",
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center rounded-[32px] bg-white px-6 py-8 text-center shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800", className)} {...props}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
        {icon ?? <Icon symbol="room_service" tone="brand" />}
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      {description ? <p className="mt-2 max-w-[32ch] text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      <div className="mt-5">{action ?? <Button>{actionLabel}</Button>}</div>
    </div>
  );
}