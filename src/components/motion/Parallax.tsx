"use client";

import { useLenis } from "lenis/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Moves its children vertically as the page scrolls, driven by Lenis.
 * `speed` is the fraction of the element's distance from the viewport centre
 * (negative values move against the scroll).
 * Only runs while on screen, and is skipped on touch / small screens and for reduced motion.
 */
export default function Parallax({
  children,
  speed = -0.1,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const disabled = window.matchMedia("(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)").matches;
    if (disabled) return;
    const observer = new IntersectionObserver(([entry]) => (active.current = entry.isIntersecting), { rootMargin: "200px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLenis(() => {
    if (!active.current || !outer.current || !inner.current) return;
    const rect = outer.current.getBoundingClientRect();
    const fromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
    inner.current.style.transform = `translate3d(0, ${(fromCenter * speed).toFixed(1)}px, 0)`;
  });

  return (
    <div ref={outer} className={className}>
      <div ref={inner} className="md:will-change-transform motion-reduce:!transform-none">
        {children}
      </div>
    </div>
  );
}
