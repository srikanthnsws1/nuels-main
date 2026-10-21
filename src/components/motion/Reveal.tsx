"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Variant = "up" | "left" | "right" | "scale" | "fade";

const hidden: Record<Variant, string> = {
  up: "translate-y-10 opacity-0",
  left: "translate-y-10 opacity-0 md:translate-y-0 md:-translate-x-10",
  right: "translate-y-10 opacity-0 md:translate-y-0 md:translate-x-10",
  scale: "scale-95 opacity-0",
  fade: "opacity-0",
};

/**
 * Fades and slides its children in the first time they scroll into view.
 * Use `immediate` for above-the-fold content: it animates with pure CSS on first paint,
 * so headings are visible before JavaScript loads (faster LCP).
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  immediate = false,
}: {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  if (immediate) {
    return (
      <div style={{ animationDelay: `${Math.round(delay / 2)}ms` }} className={`reveal-now reveal-now-${variant} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none ${
        visible ? "translate-x-0 translate-y-0 scale-100 opacity-100" : hidden[variant]
      } ${className}`}
    >
      {children}
    </div>
  );
}
