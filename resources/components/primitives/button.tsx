import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-orange-600 text-white shadow-[0_12px_24px_rgba(236,91,19,0.22)] hover:bg-orange-700 focus-visible:ring-orange-300",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-300 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white",
  outline:
    "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-orange-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost:
    "bg-transparent text-slate-700 hover:bg-orange-50 hover:text-orange-700 focus-visible:ring-orange-300 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-orange-300",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold",
  md: "min-h-12 rounded-2xl px-4 py-3 text-sm font-semibold",
  lg: "min-h-14 rounded-2xl px-5 py-4 text-base font-bold",
  icon: "size-11 rounded-full p-0",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      type={type}
      {...props}
    >
      {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
      {children ? <span>{children}</span> : null}
      {trailingIcon ? <span className="shrink-0">{trailingIcon}</span> : null}
    </button>
  );
}