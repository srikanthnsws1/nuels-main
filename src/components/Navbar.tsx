"use client";

import { useLenis } from "lenis/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { CloseIcon, MenuIcon } from "./icons";
import { navLinks } from "@/data/site";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Sticky: always visible, with stronger glass once the page is scrolled.
  useLenis(({ scroll }) => setScrolled(scroll > 12));

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4 lg:pt-5"
    >
      <nav
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border pl-4 pr-2 transition-[background-color,border-color,box-shadow] duration-500 sm:h-16 sm:pl-5 lg:grid lg:grid-cols-[1fr_auto_1fr] xl:max-w-7xl ${
          scrolled || open
            ? "border-forest-100 bg-white/95 shadow-lg shadow-forest-900/10 md:bg-white/90 md:backdrop-blur-md"
            : "border-white/60 bg-white/90 shadow-sm shadow-forest-900/5 md:bg-white/70 md:backdrop-blur"
        }`}
      >
        <div className="justify-self-start">
          <Logo priority />
        </div>

        {/* centered links */}
        <ul className="hidden items-center gap-1 rounded-full bg-forest-50/80 p-1 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`block rounded-full px-4 py-2 text-sm font-medium transition xl:px-5 ${
                  isActive(link.href)
                    ? "bg-forest-700 text-white shadow-md shadow-forest-700/20"
                    : "text-slate-700 hover:bg-white hover:text-forest-700"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 justify-self-end sm:gap-3">
          <Link href="/login" className="hidden px-2 text-sm font-semibold text-forest-700 hover:text-forest-500 lg:block">
            Log in
          </Link>
          <Link
            href="/courses"
            className="hidden rounded-full bg-spark-500 px-5 py-2.5 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400 sm:block"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition hover:bg-forest-100 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* mobile / tablet menu */}
      <div
        className={`mx-auto mt-2 max-w-6xl origin-top overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-xl shadow-forest-900/10 transition-[opacity,transform] duration-300 lg:hidden ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <ul className="grid gap-1 p-3 md:grid-cols-2">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`block rounded-2xl px-4 py-3 font-medium transition ${
                  isActive(link.href) ? "bg-forest-700 text-white" : "text-slate-700 hover:bg-forest-50"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 border-t border-forest-100 p-3">
          <Link href="/login" className="flex-1 rounded-full border border-forest-200 py-2.5 text-center font-semibold text-forest-700">
            Log in
          </Link>
          <Link
            href="/courses"
            onClick={() => setOpen(false)}
            className="flex-1 rounded-full bg-forest-700 py-2.5 text-center font-semibold text-white"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
