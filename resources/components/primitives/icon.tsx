import type { HTMLAttributes, ReactNode } from "react";

import { cn, type Size } from "../utils";

const sizeClasses: Record<Size, string> = {
  sm: "size-4 text-sm",
  md: "size-5 text-base",
  lg: "size-6 text-lg",
};

export type IconProps = HTMLAttributes<HTMLSpanElement> & {
  size?: Size;
  tone?: "default" | "muted" | "brand" | "inverse" | "success" | "warning" | "danger";
  symbol?: string;
  children?: ReactNode;
};

const toneClasses = {
  default: "text-slate-700 dark:text-slate-100",
  muted: "text-slate-400 dark:text-slate-500",
  brand: "text-orange-600 dark:text-orange-300",
  inverse: "text-white",
  success: "text-emerald-600",
  warning: "text-amber-500",
  danger: "text-red-600",
};

export function Icon({
  className,
  size = "md",
  tone = "default",
  symbol,
  children,
  ...props
}: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "material-symbols-outlined inline-flex shrink-0 items-center justify-center leading-none",
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children ?? symbol}
    </span>
  );
}