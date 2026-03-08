import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

type SurfaceVariant = "app" | "base" | "raised" | "muted" | "inverse";

const variantClasses: Record<SurfaceVariant, string> = {
  app: "bg-[#f8f6f2] text-slate-900 dark:bg-[#221610] dark:text-slate-100",
  base: "bg-white text-slate-900 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800",
  raised: "bg-[#fff9f5] text-slate-900 shadow-[0_10px_25px_rgba(15,23,42,0.08)] ring-1 ring-orange-100 dark:bg-[#352319] dark:text-slate-100 dark:ring-[#4b2f21]",
  muted: "bg-[#f4eee8] text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  inverse: "bg-[#2c1d15] text-slate-100 shadow-sm ring-1 ring-[#4b2f21]",
};

export type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant;
  padding?: "none" | "sm" | "md" | "lg";
  asChild?: boolean;
  children?: ReactNode;
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Surface({
  className,
  variant = "base",
  padding = "md",
  asChild = false,
  children,
  ...props
}: SurfaceProps) {
  const Component = (asChild ? "span" : "div") as ElementType;

  return (
    <Component
      className={cn("rounded-3xl", variantClasses[variant], paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </Component>
  );
}