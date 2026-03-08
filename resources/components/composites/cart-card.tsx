import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Badge } from "../primitives/badge";
import { Button } from "../primitives/button";
import { InfoRow } from "./info-row";
import { cn } from "../utils";

export type CartCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  subtitle?: string;
  total: string;
  itemCount?: string;
  status?: string;
  image?: ReactNode;
  metadata?: Array<{ label: string; value: string }>;
  primaryAction?: ReactNode;
};

export function CartCard({
  className,
  title,
  subtitle,
  total,
  itemCount,
  status,
  image,
  metadata = [],
  primaryAction,
  type = "button",
  ...props
}: CartCardProps) {
  return (
    <button
      className={cn(
        "flex w-full flex-col gap-4 rounded-[28px] bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition-colors hover:ring-orange-200 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-orange-500/20",
        className,
      )}
      type={type}
      {...props}
    >
      <div className="flex items-start gap-4">
        <div className="aspect-square w-20 shrink-0 overflow-hidden rounded-3xl bg-orange-100 dark:bg-slate-800">
          {image ?? <div className="h-full w-full bg-gradient-to-br from-orange-100 to-orange-300" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
              {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
            </div>
            {status ? <Badge variant="brand">{status}</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {itemCount ? <Badge variant="neutral">{itemCount}</Badge> : null}
            <Badge variant="inverse">{total}</Badge>
          </div>
        </div>
      </div>
      {metadata.length ? (
        <div className="space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
          {metadata.map((entry) => (
            <InfoRow key={entry.label} label={entry.label} value={entry.value} />
          ))}
        </div>
      ) : null}
      <div>{primaryAction ?? <Button fullWidth>Resume cart</Button>}</div>
    </button>
  );
}