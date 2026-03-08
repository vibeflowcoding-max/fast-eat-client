import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

export type AppShellProps = HTMLAttributes<HTMLDivElement> & {
  header?: ReactNode;
  footer?: ReactNode;
  chromeInset?: "none" | "bottom-nav" | "action-bar";
};

const insetClasses = {
  none: "pb-6",
  "bottom-nav": "pb-28",
  "action-bar": "pb-32",
};

export function AppShell({
  className,
  header,
  footer,
  chromeInset = "bottom-nav",
  children,
  ...props
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f8f6f2] text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[448px] flex-col">
        {header}
        <main className={cn("flex-1 px-4", insetClasses[chromeInset], className)} {...props}>
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}