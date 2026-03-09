import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../utils";

export type AuthShellProps = HTMLAttributes<HTMLDivElement> & {
  brand: string;
  title: string;
  description: string;
  heroTitle?: string;
  heroDescription?: string;
  heroFooterText?: string;
  heroVisual?: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  className,
  brand,
  title,
  description,
  heroTitle,
  heroDescription,
  heroFooterText,
  heroVisual,
  footer,
  children,
  ...props
}: AuthShellProps) {
  return (
    <main
      className={cn(
        "min-h-screen bg-[#f8f6f2] px-4 py-8 text-slate-900 dark:bg-[#221610] dark:text-slate-100 md:px-6",
        className,
      )}
      {...props}
    >
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[36px] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)] ring-1 ring-orange-100 dark:bg-slate-950 dark:ring-slate-800 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-full overflow-hidden bg-gradient-to-br from-orange-700 via-orange-600 to-orange-400 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)]" />
          <div className="relative z-10 inline-flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <span className="material-symbols-outlined text-3xl">restaurant</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">{brand}</span>
          </div>

          <div className="relative z-10 max-w-md space-y-5">
            {heroVisual ? <div className="mb-8">{heroVisual}</div> : null}
            {heroTitle ? <h2 className="text-5xl font-bold leading-[1.05] tracking-tight">{heroTitle}</h2> : null}
            {heroDescription ? <p className="text-lg text-white/82">{heroDescription}</p> : null}
          </div>
          {heroFooterText ? <div className="relative z-10 text-sm text-white/72">{heroFooterText}</div> : null}
        </section>

        <section className="flex min-h-full flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="mx-auto w-full max-w-[440px]">
            <div className="mb-8 space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center justify-center gap-3 lg:justify-start">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                  <span className="material-symbols-outlined text-[28px]">restaurant</span>
                </div>
                <span className="text-xl font-bold tracking-tight">{brand}</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{title}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            </div>

            <div className="space-y-6">{children}</div>

            {footer ? <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}