import type { HTMLAttributes, ReactNode } from "react";

import { SectionHeader } from "../composites/section-header";
import { cn } from "../utils";

export type HorizontalCollectionsProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
};

export function HorizontalCollections({
  className,
  title,
  eyebrow,
  description,
  action,
  children,
  ...props
}: HorizontalCollectionsProps) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      <SectionHeader action={action} description={description} eyebrow={eyebrow} title={title} />
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}