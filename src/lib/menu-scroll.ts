const DEFAULT_MENU_SCROLL_OFFSET = 132;
const SECTION_TITLE_CLEARANCE = 20;

export function getMenuStickyOffset(): number {
    if (typeof document === 'undefined') {
        return DEFAULT_MENU_SCROLL_OFFSET;
    }

    const stickyNav = document.querySelector<HTMLElement>('[data-menu-sticky-nav="true"]');
    if (!stickyNav) {
        return DEFAULT_MENU_SCROLL_OFFSET;
    }

    const height = stickyNav.getBoundingClientRect().height;
    return height > 0 ? height : DEFAULT_MENU_SCROLL_OFFSET;
}

export function getCategoryScrollTop(section: HTMLElement): number {
    const top = section.getBoundingClientRect().top + window.scrollY;
    const offset = getCategoryActivationThreshold();
    return Math.max(top - offset, 0);
}

export function getCategoryActivationThreshold(): number {
    return getMenuStickyOffset() + SECTION_TITLE_CLEARANCE;
}