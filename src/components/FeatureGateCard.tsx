'use client';

import React from 'react';
import { ArrowRight, Home } from 'lucide-react';
import { Button, Surface } from '@/../resources/components';

type FeatureGateCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  analyticsScope: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
};

export default function FeatureGateCard({
  eyebrow,
  title,
  description,
  icon,
  analyticsScope,
  primaryLabel,
  secondaryLabel,
  onPrimaryAction,
  onSecondaryAction,
}: FeatureGateCardProps) {
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent(`fast-eat:${analyticsScope}_gate_impression`, {
      detail: { scope: analyticsScope },
    }));
  }, [analyticsScope]);

  const handlePrimaryAction = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`fast-eat:${analyticsScope}_gate_click`, {
        detail: { scope: analyticsScope, target: 'sign_in' },
      }));
    }

    onPrimaryAction();
  };

  const handleSecondaryAction = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`fast-eat:${analyticsScope}_gate_click`, {
        detail: { scope: analyticsScope, target: 'home' },
      }));
    }

    onSecondaryAction();
  };

  return (
    <Surface className="relative overflow-hidden rounded-[2rem]" variant="raised" padding="none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.24),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.18),transparent_42%)]" />
      <div className="relative space-y-5 px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
              {eyebrow}
            </p>
            <div className="space-y-2">
              <h2 className="max-w-[18ch] text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                {title}
              </h2>
              <p className="max-w-[34ch] text-sm leading-6 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            </div>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-white/85 text-orange-600 shadow-[0_14px_34px_-22px_rgba(234,88,12,0.8)] ring-1 ring-orange-100 dark:bg-slate-950/60 dark:text-orange-300 dark:ring-orange-900/50">
            {icon}
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-white/75 p-4 ring-1 ring-white/70 backdrop-blur dark:bg-slate-950/35 dark:ring-slate-800/80">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="sm:flex-1"
              leadingIcon={<ArrowRight className="h-4 w-4" />}
              onClick={handlePrimaryAction}
              size="md"
            >
              {primaryLabel}
            </Button>
            <Button
              className="sm:flex-1"
              leadingIcon={<Home className="h-4 w-4" />}
              onClick={handleSecondaryAction}
              size="md"
              variant="outline"
            >
              {secondaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </Surface>
  );
}