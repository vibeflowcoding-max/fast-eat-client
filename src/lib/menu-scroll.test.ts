import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCategoryActivationThreshold, getCategoryScrollTop, getMenuStickyOffset } from './menu-scroll';

describe('menu-scroll', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('uses the sticky nav height when available', () => {
    const nav = document.createElement('div');
    nav.dataset.menuStickyNav = 'true';
    nav.getBoundingClientRect = vi.fn(() => ({
      height: 96,
    } as DOMRect));
    document.body.appendChild(nav);

    expect(getMenuStickyOffset()).toBe(96);
  });

  it('falls back to the default offset when the nav is missing', () => {
    expect(getMenuStickyOffset()).toBe(132);
  });

  it('uses the same threshold for activation and target scroll offset', () => {
    const nav = document.createElement('div');
    nav.dataset.menuStickyNav = 'true';
    nav.getBoundingClientRect = vi.fn(() => ({
      height: 110,
    } as DOMRect));
    document.body.appendChild(nav);

    expect(getCategoryActivationThreshold()).toBe(130);
  });

  it('returns a scroll target that keeps the section title below the sticky nav', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(540);

    const nav = document.createElement('div');
    nav.dataset.menuStickyNav = 'true';
    nav.getBoundingClientRect = vi.fn(() => ({
      height: 104,
    } as DOMRect));
    document.body.appendChild(nav);

    const section = document.createElement('section');
    section.getBoundingClientRect = vi.fn(() => ({
      top: 280,
    } as DOMRect));

    expect(getCategoryScrollTop(section)).toBe(696);
  });
});