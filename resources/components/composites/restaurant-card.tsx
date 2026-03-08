import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Badge } from "../primitives/badge";
import { Button } from "../primitives/button";
import { RatingDisplay } from "./rating-display";
import { cn } from "../utils";

export type RestaurantCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  categories?: string[];
  eta?: string;
  averageTicket?: string;
  deliveryFee?: string;
  rating?: number | string;
  image?: ReactNode;
  badge?: string;
  safeLabel?: string;
  favoriteAction?: ReactNode;
};

export function RestaurantCard({
  className,
  title,
  categories = [],
  eta,
  averageTicket,
  deliveryFee,
  rating,
  image,
  badge,
  safeLabel,
  favoriteAction,
  type = "button",
  ...props
}: RestaurantCardProps) {
  return (
    <button
      className={cn(
        "group flex w-72 shrink-0 flex-col overflow-hidden rounded-[28px] bg-white text-left shadow-[0_10px_25px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 transition-transform hover:-translate-y-0.5 dark:bg-slate-900 dark:ring-slate-800",
        className,
      )}
      type={type}
      {...props}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-orange-100 dark:bg-slate-800">
        {image ?? <div className="h-full w-full bg-gradient-to-br from-orange-200 to-orange-400" />}
        {badge ? <Badge className="absolute left-3 top-3" variant="brand">{badge}</Badge> : null}
        <div className="absolute right-3 top-3">{favoriteAction ?? <Button size="icon" variant="outline">♥</Button>}</div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {categories.length ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{categories.join(", ")}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {eta ? <Badge variant="neutral">{eta}</Badge> : null}
          {averageTicket ? <Badge variant="neutral">{averageTicket}</Badge> : null}
          {deliveryFee ? <Badge variant="neutral">{deliveryFee}</Badge> : null}
          {rating !== undefined ? <RatingDisplay compact rating={rating} /> : null}
          {safeLabel ? <Badge variant="success">{safeLabel}</Badge> : null}
        </div>
      </div>
    </button>
  );
}