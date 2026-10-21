"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lenis keeps its own scroll position, so jump it back to the top on every page change. */
function ResetOnNavigate() {
  const lenis = useLenis();
  const pathname = usePathname();

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [lenis, pathname]);

  return null;
}

/** Site-wide Lenis smooth scrolling. Anchor links are smooth-scrolled with room for the fixed navbar. */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: prefersReducedMotion ? 1 : 0.14,
        syncTouch: false,
        wheelMultiplier: 1,
        anchors: { offset: -80, duration: prefersReducedMotion ? 0 : 1.4 },
      }}
    >
      <ResetOnNavigate />
      {children}
    </ReactLenis>
  );
}
