"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown instead of a blank page when something on a page crashes. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-forest-50/60 px-4 text-center">
      <h1 className="text-2xl font-bold text-forest-950">Something went wrong</h1>
      <p className="mt-2 max-w-md text-slate-600">
        Please try again. If it keeps happening, contact us at <a href="mailto:info@nuelsmart.com" className="font-medium text-forest-700">info@nuelsmart.com</a>.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-forest-600">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-forest-200 px-7 py-3 text-sm font-semibold text-forest-700 transition hover:bg-white">
          Back to home
        </Link>
      </div>
    </div>
  );
}
