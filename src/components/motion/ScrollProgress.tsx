"use client";

import { useLenis } from "lenis/react";
import { useRef } from "react";

/** Thin lime bar at the top of the page showing scroll progress. */
export default function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useLenis((lenis) => {
    if (bar.current) bar.current.style.transform = `scaleX(${lenis.progress || 0})`;
  });

  return (
    <div
      ref={bar}
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-1 origin-left scale-x-0 bg-gradient-to-r from-forest-500 to-spark-500"
    />
  );
}
