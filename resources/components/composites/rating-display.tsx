import type { HTMLAttributes } from "react";

import { Badge } from "../primitives/badge";
import { Icon } from "../primitives/icon";

export type RatingDisplayProps = HTMLAttributes<HTMLSpanElement> & {
  rating: number | string;
  reviewCount?: number;
  compact?: boolean;
};

export function RatingDisplay({ rating, reviewCount, compact = false, ...props }: RatingDisplayProps) {
  const content = (
    <>
      <Icon size="sm" symbol="star" tone="warning" />
      <span>{rating}</span>
      {reviewCount !== undefined ? <span className="text-slate-400">({reviewCount})</span> : null}
    </>
  );

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200" {...props}>
        {content}
      </span>
    );
  }

  return (
    <Badge variant="neutral" {...props}>
      {content}
    </Badge>
  );
}