import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "../primitives/button";
import { cn } from "../utils";

export type PromoBannerProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaAction?: ReactNode;
  visual?: ReactNode;
  tone?: "orange" | "berry" | "fresh";
};

const toneClasses = {
  orange: "from-orange-600 to-orange-400",
  berry: "from-fuchsia-600 to-indigo-500",
  fresh: "from-emerald-500 to-teal-400",
};

export function PromoBanner({
  className,
  title,
  description,
  eyebrow,
  ctaLabel = "Explore",
  ctaAction,
  visual,
  tone = "orange",
  ...props
}: PromoBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[32px] bg-gradient-to-br p-5 text-white shadow-[0_12px_24px_rgba(236,91,19,0.22)]",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="absolute inset-y-0 right-0 w-32 opacity-20">{visual}</div>
      <div className="relative z-10 max-w-[24rem] space-y-3">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">{eyebrow}</p> : null}
        <h3 className="text-xl font-bold leading-tight">{title}</h3>
        {description ? <p className="text-sm text-white/80">{description}</p> : null}
        <div>{ctaAction ?? <Button variant="outline">{ctaLabel}</Button>}</div>
      </div>
    </div>
  );
}