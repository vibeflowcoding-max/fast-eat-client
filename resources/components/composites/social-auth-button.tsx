import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Button } from "../primitives/button";
import { cn } from "../utils";

export type SocialAuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
};

export function SocialAuthButton({ className, icon, children, ...props }: SocialAuthButtonProps) {
  return (
    <Button
      className={cn(
        "justify-center border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        className,
      )}
      fullWidth
      leadingIcon={icon}
      size="lg"
      variant="outline"
      {...props}
    >
      {children}
    </Button>
  );
}