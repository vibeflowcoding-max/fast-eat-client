import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

type BadgeVariant = "brand" | "neutral" | "success" | "warning" | "danger" | "inverse";

const variantClasses: Record<BadgeVariant, string> = {
  brand: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-400/30",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30",
  warning: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/30",
  danger: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/30",
  inverse: "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-950 dark:ring-white",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function Badge({
  className,
  variant = "neutral",
  leading,
  trailing,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {leading ? <span className="shrink-0">{leading}</span> : null}
      {children ? <span>{children}</span> : null}
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </span>
  );
}