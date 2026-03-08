export const HOME_VISUAL_TOKENS = {
    sectionSpacing: 'mb-6',
    titleStyle: 'text-lg font-black leading-tight tracking-[-0.02em] text-[var(--color-text)]',
    subtitleStyle: 'mt-1 text-sm leading-5 text-[var(--color-text-muted)]',
    heroContainer: 'rounded-[2rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(255,247,239,0.98)_100%)] px-4 py-5 shadow-[0_18px_44px_-30px_rgba(98,60,29,0.28)]',
    heroHeader: 'mb-3 flex items-start justify-between gap-2',
    greetingStyle: 'text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]',
    heroTitleStyle: 'mt-1 text-2xl font-black leading-tight tracking-[-0.03em] text-[var(--color-text)]',
    locationChipStyle:
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700',
    searchInputStyle:
        'ui-input w-full rounded-2xl py-3.5 pl-10 pr-4 text-sm shadow-[0_8px_24px_-20px_rgba(98,60,29,0.4)] outline-none transition-all focus:border-[var(--color-border-strong)] focus:ring-0'
} as const;
