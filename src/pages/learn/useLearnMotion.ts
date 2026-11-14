import { gsap } from "gsap";
import { useLayoutEffect, type RefObject } from "react";

import {
  prefersReducedMotion,
  refreshWhenLoaded,
  revealSections,
  startSmoothScroll,
} from "@/pages/site/siteMotion";

// Hero entrance plus one reveal per section, as in the reference. Reduced motion: nothing moves and
// the markup already shows everything.
export const useLearnMotion = (root: RefObject<HTMLElement | null>): void => {
  useLayoutEffect(() => {
    const element = root.current;
    if (element === null || prefersReducedMotion()) return;
    const stopSmoothScroll = startSmoothScroll();
    const context = gsap.context(() => {
      gsap.from("[data-intro]", {
        y: 28,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.1,
      });
      revealSections();
    }, element);
    const stopRefreshing = refreshWhenLoaded();
    return () => {
      stopRefreshing();
      context.revert();
      stopSmoothScroll();
    };
  }, [root]);
};
