import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

import { cn } from "../utils";

type FieldState = "default" | "error" | "disabled";

function getFieldClasses(state: FieldState) {
  if (state === "error") {
    return "border-red-300 bg-red-50/40 focus-within:border-red-500 focus-within:ring-red-200 dark:border-red-500/60 dark:bg-red-500/10";
  }

  if (state === "disabled") {
    return "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-500";
  }

  return "border-slate-200 bg-white focus-within:border-orange-500 focus-within:ring-orange-200 dark:border-slate-700 dark:bg-slate-900/80";
}

export type FieldLabelProps = {
  label: string;
  description?: string;
  required?: boolean;
  requiredLabel?: string;
  action?: ReactNode;
};

export function FieldLabel({ label, description, required = false, requiredLabel, action }: FieldLabelProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-1">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>
          {required && requiredLabel ? (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
              {requiredLabel}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  description?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  requiredLabel?: string;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
};

export function TextField({
  className,
  label,
  description,
  helperText,
  errorText,
  required = false,
  requiredLabel,
  leadingIcon,
  trailingAction,
  disabled,
  ...props
}: TextFieldProps) {
  const state: FieldState = errorText ? "error" : disabled ? "disabled" : "default";

  return (
    <label className="flex w-full flex-col gap-2">
      {label ? (
        <FieldLabel label={label} description={description} required={required} requiredLabel={requiredLabel} />
      ) : null}
      <span
        className={cn(
          "flex min-h-14 items-center rounded-2xl border px-4 ring-1 ring-transparent transition-colors",
          getFieldClasses(state),
          disabled && "cursor-not-allowed opacity-80",
        )}
      >
        {leadingIcon ? <span className="mr-3 shrink-0 text-slate-400">{leadingIcon}</span> : null}
        <input
          className={cn(
            "w-full border-0 bg-transparent p-0 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100",
            className,
          )}
          disabled={disabled}
          {...props}
        />
        {trailingAction ? <span className="ml-3 shrink-0">{trailingAction}</span> : null}
      </span>
      {errorText ? (
        <FieldMessage tone="error">{errorText}</FieldMessage>
      ) : helperText ? (
        <FieldMessage tone="muted">{helperText}</FieldMessage>
      ) : null}
    </label>
  );
}

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  description?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  requiredLabel?: string;
};

export function TextAreaField({
  className,
  label,
  description,
  helperText,
  errorText,
  required = false,
  requiredLabel,
  disabled,
  ...props
}: TextAreaFieldProps) {
  const state: FieldState = errorText ? "error" : disabled ? "disabled" : "default";

  return (
    <label className="flex w-full flex-col gap-2">
      {label ? <FieldLabel label={label} description={description} required={required} requiredLabel={requiredLabel} /> : null}
      <span
        className={cn(
          "flex rounded-3xl border px-4 py-3 ring-1 ring-transparent transition-colors",
          getFieldClasses(state),
          disabled && "cursor-not-allowed opacity-80",
        )}
      >
        <textarea
          className={cn(
            "min-h-28 w-full resize-none border-0 bg-transparent p-0 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100",
            className,
          )}
          disabled={disabled}
          {...props}
        />
      </span>
      {errorText ? (
        <FieldMessage tone="error">{errorText}</FieldMessage>
      ) : helperText ? (
        <FieldMessage tone="muted">{helperText}</FieldMessage>
      ) : null}
    </label>
  );
}

export type ChoiceCardProps = {
  title: string;
  description?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  type?: "radio" | "checkbox";
  helperText?: string;
  onClick?: () => void;
};

export function ChoiceCard({
  title,
  description,
  trailing,
  leading,
  checked = false,
  disabled = false,
  type = "radio",
  helperText,
  onClick,
}: ChoiceCardProps) {
  return (
    <button
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
        checked
          ? "border-orange-500 bg-orange-50/70 dark:bg-orange-500/10"
          : "border-slate-200 bg-white hover:border-orange-300 dark:border-slate-700 dark:bg-slate-900",
        disabled && "pointer-events-none opacity-50",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300 dark:border-slate-600",
          type === "checkbox" && "rounded-md",
        )}
      >
        {checked ? <span className="text-[10px] font-bold">✓</span> : null}
      </span>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
        {description ? (
          <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{description}</span>
        ) : null}
        {helperText ? (
          <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{helperText}</span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}

export type ToggleSwitchProps = {
  label: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
};

export function ToggleSwitch({
  label,
  description,
  checked = false,
  disabled = false,
  onChange,
}: ToggleSwitchProps) {
  return (
    <button
      aria-pressed={checked}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-orange-300 dark:border-slate-700 dark:bg-slate-900",
        disabled && "pointer-events-none opacity-50",
      )}
      onClick={() => onChange?.(!checked)}
      type="button"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>
        {description ? (
          <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{description}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-orange-600" : "bg-slate-300 dark:bg-slate-700",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
    </button>
  );
}

export type FieldMessageProps = {
  tone?: "muted" | "error" | "success";
  children: ReactNode;
};

export function FieldMessage({ tone = "muted", children }: FieldMessageProps) {
  const toneClass =
    tone === "error"
      ? "text-red-600 dark:text-red-300"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-300"
        : "text-slate-500 dark:text-slate-400";

  return <p className={cn("px-1 text-xs", toneClass)}>{children}</p>;
}