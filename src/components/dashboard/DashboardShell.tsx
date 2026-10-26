"use client";

import Link from "next/link";
import { useLenis } from "lenis/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Logo from "../Logo";
import { CartIcon, LogoutIcon, type IconProps } from "../icons";
import ProfileMenu from "./ProfileMenu";
import { homeFor, signOut, useAuth, type AppUser, type Role } from "@/lib/auth";

export type Section = { id: string; label: string; icon: ComponentType<IconProps> };

/**
 * Sidebar + top bar layout shared by every dashboard, and the role guard for it:
 * signed-out visitors go to /login and users with another role go to their own dashboard.
 * With `paged`, each sidebar item opens its own page (kept in the URL hash, e.g. /admin#users)
 * instead of scrolling one long page; `children` receives the current page id.
 */
export default function DashboardShell({
  role,
  sections,
  sidebarCard,
  paged = false,
  children,
}: {
  role: Role;
  sections: Section[];
  sidebarCard?: ReactNode;
  paged?: boolean;
  children: (user: AppUser, page: string) => ReactNode;
}) {
  const router = useRouter();
  const lenis = useLenis();
  const { user, ready } = useAuth();
  const [active, setActive] = useState(sections[0]?.id);

  // Paged mode: the URL hash picks the page, so refresh, bookmarks and Back/Forward all work.
  useEffect(() => {
    if (!paged) return;
    const sync = () => {
      const id = window.location.hash.slice(1);
      setActive(sections.some((s) => s.id === id) ? id : sections[0]?.id);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [paged, sections]);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(homeFor[user.role]);
  }, [ready, user, role, router]);

  if (!user || user.role !== role) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-forest-50/60">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" aria-label="Loading" />
      </div>
    );
  }

  const logout = async () => {
    await signOut();
    router.push("/");
  };

  const navLink = (s: Section, compact = false) => {
    const Icon = s.icon;
    const on = active === s.id;
    return (
      <a
        key={s.id}
        href={`#${s.id}`}
        onClick={(e) => {
          if (paged) {
            // Open the page at the top instead of scrolling to an anchor.
            e.preventDefault();
            if (s.id !== active) window.history.pushState(null, "", `#${s.id}`);
            lenis?.scrollTo(0, { immediate: true });
            window.scrollTo(0, 0);
          }
          setActive(s.id);
        }}
        aria-current={on ? "true" : undefined}
        className={
          compact
            ? `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                on ? "bg-forest-700 text-white shadow-lg shadow-forest-700/20" : "border border-forest-100 bg-white text-slate-600"
              }`
            : `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                on ? "bg-spark-500 font-semibold text-forest-900" : "text-forest-100 hover:bg-white/10 hover:text-white"
              }`
        }
      >
        <Icon className="h-[18px] w-[18px]" />
        {s.label}
      </a>
    );
  };

  return (
    <div className="min-h-dvh bg-forest-50/60">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-hidden bg-forest-800 p-6 lg:flex">
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-10" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-forest-600),transparent)] opacity-40" />
        <div className="relative">
          <Logo light />
        </div>
        <nav className="relative mt-10 flex flex-col gap-1" aria-label="Dashboard">
          {sections.map((s) => navLink(s))}
        </nav>

        <div className="relative mt-auto space-y-4">
          {sidebarCard}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-forest-100 transition hover:bg-white/10 hover:text-white"
          >
            <LogoutIcon className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-forest-100 bg-white/95 md:bg-white/85 md:backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:h-20 sm:px-6 xl:px-10">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {role === "student" && (
                <Link
                  href="/cart"
                  aria-label={`Cart, ${user.cart.length} ${user.cart.length === 1 ? "course" : "courses"}`}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition hover:bg-forest-100"
                >
                  <CartIcon className="h-5 w-5" />
                  {user.cart.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-spark-500 px-1 text-[11px] font-bold text-forest-900">
                      {user.cart.length}
                    </span>
                  )}
                </Link>
              )}
              <ProfileMenu user={user} onLogout={logout} />
            </div>
          </div>
          {/* mobile / tablet section nav */}
          <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden" aria-label="Dashboard">
            {sections.map((s) => navLink(s, true))}
          </nav>
        </header>

        <main className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-10">{children(user, active)}</main>
      </div>
    </div>
  );
}
