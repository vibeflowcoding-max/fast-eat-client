import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

export type InfoRowProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value?: ReactNode;
  description?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function InfoRow({
  className,
  label,
  value,
  description,
  leading,
  trailing,
  ...props
}: InfoRowProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
          {value ? <div className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</div> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}