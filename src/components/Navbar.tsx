"use client";

import { useLenis } from "lenis/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { CartIcon, ChevronDownIcon, CloseIcon, MenuIcon } from "./icons";
import { moreLinks, navLinks } from "@/data/site";
import { homeFor, signOut, useAuth } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Sticky: always visible, with stronger glass once the page is scrolled.
  useLenis(({ scroll }) => setScrolled(scroll > 12));

  // "More" drop-down in the desktop menu.
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);
  const moreActive = moreLinks.some((l) => isActive(l.href));
  useEffect(() => {
    if (!more) return;
    const onDown = (e: MouseEvent) => moreRef.current && !moreRef.current.contains(e.target as Node) && setMore(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [more]);

  // Close the menus after navigating.
  useEffect(() => {
    setOpen(false);
    setMore(false);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4 lg:pt-5">
      <nav
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border pl-4 pr-2 transition-[background-color,border-color,box-shadow] duration-500 sm:h-16 sm:pl-5 lg:grid lg:grid-cols-[auto_auto_auto] lg:justify-between xl:max-w-7xl xl:grid-cols-[1fr_auto_1fr] ${
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
                className={`block whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium transition xl:px-4 ${
                  isActive(link.href)
                    ? "bg-forest-700 text-white shadow-md shadow-forest-700/20"
                    : "text-slate-700 hover:bg-white hover:text-forest-700"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              aria-expanded={more}
              aria-haspopup="true"
              className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium transition xl:px-4 ${
                moreActive ? "bg-forest-700 text-white shadow-md shadow-forest-700/20" : "text-slate-700 hover:bg-white hover:text-forest-700"
              }`}
            >
              More <ChevronDownIcon className={`h-3.5 w-3.5 transition ${more ? "rotate-180" : ""}`} />
            </button>
            {more && (
              <ul className="absolute right-0 top-full z-50 mt-3 w-60 rounded-3xl border border-forest-100 bg-white p-2 shadow-2xl shadow-forest-900/15">
                {moreLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMore(false)}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className={`block rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                        isActive(link.href) ? "bg-forest-50 text-forest-800" : "text-slate-700 hover:bg-forest-50 hover:text-forest-800"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>

        <div className="flex items-center gap-2 justify-self-end sm:gap-3">
          {ready && user && (
            <Link
              href="/cart"
              aria-label={`Cart, ${user.cart.length} ${user.cart.length === 1 ? "course" : "courses"}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition hover:bg-forest-100"
            >
              <CartIcon className="h-5 w-5" />
              {user.cart.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-spark-500 px-1 text-[11px] font-bold text-forest-900">
                  {user.cart.length}
                </span>
              )}
            </Link>
          )}
          {ready && user ? (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href={homeFor[user.role]}
                className="whitespace-nowrap rounded-full bg-forest-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-forest-700/20 transition hover:bg-forest-600"
              >
                {user.role === "admin" ? "Admin Panel" : user.role === "mentor" ? "Tutor Hub" : "Dashboard"}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="whitespace-nowrap px-2 text-xs font-medium text-slate-500 hover:text-red-600 transition"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden whitespace-nowrap px-2 text-sm font-semibold text-forest-700 hover:text-forest-500 lg:block">
                Log in
              </Link>
              <Link
                href="/register"
                className="hidden whitespace-nowrap rounded-full bg-spark-500 px-4 py-2.5 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400 sm:block"
              >
                Get Started
              </Link>
            </>
          )}

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
          {[...navLinks, ...moreLinks].map((link) => (
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
          {ready && user ? (
            <>
              <Link
                href={homeFor[user.role]}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-forest-700 py-2.5 text-center font-semibold text-white"
              >
                {user.role === "admin" ? "Admin Panel" : user.role === "mentor" ? "Tutor Hub" : "Dashboard"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="flex-1 rounded-full border border-forest-200 py-2.5 text-center font-semibold text-slate-700 hover:bg-forest-50"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-forest-200 py-2.5 text-center font-semibold text-forest-700"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-forest-700 py-2.5 text-center font-semibold text-white"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
