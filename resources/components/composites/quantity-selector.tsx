import type { HTMLAttributes } from "react";

import { Button } from "../primitives/button";
import { cn } from "../utils";

export type QuantitySelectorProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  decrementLabel?: string;
  incrementLabel?: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
};

export function QuantitySelector({
  className,
  value,
  min = 1,
  max,
  disabled = false,
  decrementLabel = "Decrease quantity",
  incrementLabel = "Increase quantity",
  onIncrement,
  onDecrement,
  ...props
}: QuantitySelectorProps) {
  const decrementDisabled = value <= min;
  const incrementDisabled = max !== undefined && value >= max;

  return (
    <div className={cn("inline-flex items-center gap-3 rounded-full bg-slate-100 p-1 dark:bg-slate-800", disabled && "opacity-70", className)} {...props}>
      <Button aria-label={decrementLabel} disabled={disabled || decrementDisabled} onClick={onDecrement} size="icon" variant="ghost">
        -
      </Button>
      <span className="min-w-8 text-center text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
      <Button aria-label={incrementLabel} disabled={disabled || incrementDisabled} onClick={onIncrement} size="icon" variant="primary">
        +
      </Button>
    </div>
  );
}