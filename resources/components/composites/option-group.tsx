import type { HTMLAttributes, ReactNode } from "react";

import { FieldMessage, FieldLabel } from "../primitives/form-controls";
import { cn } from "../utils";

export type OptionGroupProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  description?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  action?: ReactNode;
};

export function OptionGroup({
  className,
  label,
  description,
  helperText,
  errorText,
  required = false,
  action,
  children,
  ...props
}: OptionGroupProps) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      <FieldLabel action={action} description={description} label={label} required={required} />
      <div className="space-y-3">{children}</div>
      {errorText ? (
        <FieldMessage tone="error">{errorText}</FieldMessage>
      ) : helperText ? (
        <FieldMessage tone="muted">{helperText}</FieldMessage>
      ) : null}
    </div>
  );
}