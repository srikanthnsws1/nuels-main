import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-forest-50/60 px-4 text-center">
      <p className="text-7xl font-bold text-forest-700">404</p>
      <h1 className="mt-4 text-2xl font-bold text-forest-950">Page not found</h1>
      <p className="mt-2 max-w-md text-slate-600">The page you&apos;re looking for may have moved or no longer exists.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-forest-600">
          Back to home
        </Link>
        <Link href="/courses" className="rounded-full border border-forest-200 px-7 py-3 text-sm font-semibold text-forest-700 transition hover:bg-white">
          Browse courses
        </Link>
      </div>
    </div>
  );
}
