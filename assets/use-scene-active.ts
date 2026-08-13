'use client';

import * as React from 'react';

interface ActiveOptions {
  /** Attribute marking the sibling panels of a deck/carousel. */
  panelAttr?: string;
  /** Class the deck's scroll driver puts on the panel currently being shown. */
  liveClass?: string;
  threshold?: number;
}

/**
 * Whether a scene may animate: it is on screen, it is the panel currently being
 * shown, and the tab is visible.
 *
 * Why not IntersectionObserver alone: a deck that keeps all panels mounted and
 * hides the inactive ones with `visibility`/`opacity` still reports every one of
 * them as intersecting, so every scene keeps burning timers off screen. The
 * deck's own "this panel is live" class is the real signal.
 *
 * Fallback: when no panel/deck exists, or the deck's driver has stood down (the
 * stacked mobile layout, or reduced motion), no panel carries `liveClass` and
 * intersection decides on its own.
 */
export function useSceneActive(
  ref: React.RefObject<HTMLElement | null>,
  {
    panelAttr = 'data-scene-panel',
    liveClass = 'is-live',
    threshold = 0.35,
  }: ActiveOptions = {},
): boolean {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const panel = node.closest<HTMLElement>(`[${panelAttr}]`);
    const deck = panel?.parentElement;

    let onScreen = !('IntersectionObserver' in window);
    let live = true;
    const sync = () => setActive(live && onScreen && !document.hidden);

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            ([entry]) => {
              onScreen = entry?.isIntersecting ?? false;
              sync();
            },
            { threshold },
          )
        : undefined;
    observer?.observe(node);

    let panelWatch: MutationObserver | undefined;
    if (panel) {
      const readPanel = () => {
        live =
          panel.classList.contains(liveClass) ||
          !deck?.querySelector(`[${panelAttr}].${liveClass}`);
        sync();
      };
      panelWatch = new MutationObserver(readPanel);
      // Observe the DECK, not just our panel: in the stacked layout our own
      // panel's class never changes, so a sibling going live is the only signal
      // that would ever reach us.
      panelWatch.observe(deck ?? panel, {
        attributeFilter: ['class'],
        subtree: true,
      });
      readPanel();
    }

    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      observer?.disconnect();
      panelWatch?.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [liveClass, panelAttr, ref, threshold]);

  return active;
}
