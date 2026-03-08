import type { HTMLAttributes } from "react";

import { cn } from "../utils";

export type StatusIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  progress?: number;
  meta?: string;
  steps?: string[];
  currentStep?: number;
};

export function StatusIndicator({
  className,
  label,
  progress,
  meta,
  steps,
  currentStep = 0,
  ...props
}: StatusIndicatorProps) {
  const normalized = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <div className={cn("space-y-3 rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800", className)} {...props}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
          {meta ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meta}</p> : null}
        </div>
        <span className="text-sm font-semibold text-orange-600 dark:text-orange-300">{normalized}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-orange-600 transition-[width]" style={{ width: `${normalized}%` }} />
      </div>
      {steps?.length ? (
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <span
              key={step}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                index <= currentStep
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              {step}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}