"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "../Logo";
import MentorVerificationModal from "../MentorVerificationModal";
import { LogoutIcon, type IconProps } from "../icons";
import { greetingName, homeFor, loginRouteFor, roleLabel, signOut, useAuth, type AppUser, type Role } from "@/lib/auth";
import { initials } from "./ui";

const dashboardLabel: Record<Role, string> = {
  admin: "Admin Dashboard",
  mentor: "Mentor Dashboard",
  student: "Student Dashboard",
};

export type Section ={ id: string; label: string; icon: ComponentType<IconProps> };

/**
 * Sidebar + top bar layout shared by every dashboard, and the role guard for it:
 * signed-out visitors go to this dashboard's login page and users with any other role
 * (admins included) are sent to their own dashboard. Each dashboard is for exactly one
 * role; firestore.rules enforces the same split on the data itself.
 */
export default function DashboardShell({
  role,
  sections,
  sidebarCard,
  children,
}: {
  role: Role;
  sections: Section[];
  sidebarCard?: ReactNode;
  children: (user: AppUser) => ReactNode;
}) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(loginRouteFor[role]);
    else if (user.requestedRole === "mentor") return; // the verification popup is shown instead
    else if (user.role !== role) router.replace(homeFor[user.role]);
  }, [ready, user, role, router]);

  // Instructor applicants wait for an admin to approve them before using any dashboard.
  if (user?.requestedRole === "mentor") {
    return (
      <div className="min-h-dvh bg-forest-50/60">
        <MentorVerificationModal
          email={user.email}
          actionLabel="Log out"
          onClose={async () => {
            await signOut();
            router.push("/");
          }}
        />
      </div>
    );
  }

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
        onClick={() => setActive(s.id)}
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
        <Link href="/" aria-label="nuelsmart home" className="relative flex items-center gap-3 rounded-3xl bg-white p-3 shadow-lg shadow-forest-950/20">
          <Image src="/images/logo-mark-sm.webp" alt="" width={48} height={48} className="h-12 w-12 shrink-0" priority />
          <span className="leading-tight">
            <span className="block text-xl font-bold tracking-tight text-forest-700">nuelsmart</span>
            <span className="block text-xs font-semibold uppercase tracking-wider text-forest-500">{dashboardLabel[role]}</span>
          </span>
        </Link>
        <nav className="no-scrollbar relative mt-8 flex min-h-0 flex-col gap-1 overflow-y-auto" aria-label="Dashboard">
          {sections.map((s) => navLink(s))}
        </nav>

        <div className="relative mt-auto space-y-4 pt-4">
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
            <div className="flex items-center gap-3">
              <Logo />
              <span className="hidden rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700 md:inline">{dashboardLabel[role]}</span>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-3 rounded-full bg-forest-50 py-1 pl-1 pr-1 sm:pr-4">
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-forest-700 text-sm font-bold text-spark-400">
                  {user.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL avatar
                    <img src={user.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(user.name) || roleLabel[role][0]
                  )}
                </span>
                <div className="hidden leading-tight sm:block">
                  <p className="text-sm font-semibold text-forest-950">{greetingName(user)}</p>
                  <p className="text-xs text-slate-500">
                    {roleLabel[role]}
                    {user.memberId && <span className="ml-1.5 font-mono font-semibold text-forest-700">· {user.memberId}</span>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-full text-forest-700 transition hover:bg-forest-50 lg:hidden"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* mobile / tablet section nav */}
          <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden" aria-label="Dashboard">
            {sections.map((s) => navLink(s, true))}
          </nav>
        </header>

        <main className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-10">{children(user)}</main>
      </div>
    </div>
  );
}
