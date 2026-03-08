import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Button } from "../primitives/button";
import { cn } from "../utils";

export type MenuItemCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  description?: string;
  price: string;
  image?: ReactNode;
  actionLabel?: string;
  metadata?: ReactNode;
};

export function MenuItemCard({
  className,
  title,
  description,
  price,
  image,
  actionLabel = "Add",
  metadata,
  type = "button",
  ...props
}: MenuItemCardProps) {
  return (
    <button
      className={cn(
        "flex w-full items-stretch gap-4 rounded-[28px] bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition-colors hover:ring-orange-200 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-orange-500/20",
        className,
      )}
      type={type}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {metadata ? <div className="text-xs text-slate-400 dark:text-slate-500">{metadata}</div> : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">{price}</span>
          <Button size="icon">+</Button>
        </div>
      </div>
      <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-3xl bg-orange-100 dark:bg-slate-800">
        {image ?? <div className="h-full w-full bg-gradient-to-br from-orange-100 to-orange-300" />}
        <span className="sr-only">{actionLabel}</span>
      </div>
    </button>
  );
}