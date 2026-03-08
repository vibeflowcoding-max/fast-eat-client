import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

export type SectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({
  className,
  title,
  eyebrow,
  description,
  action,
  ...props
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)} {...props}>
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        {description ? (
          <p className="max-w-[34ch] text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}