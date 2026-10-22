import type { Metadata } from "next";
import Link from "next/link";
import AdminLoginForm from "@/components/AdminLoginForm";
import Logo from "@/components/Logo";
import { ShieldIcon } from "@/components/icons";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Admin Portal Login | Nuels",
  description: "Secure login for Nuels administrators to manage users, courses, and platform settings.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-dvh bg-slate-950 text-white lg:grid-cols-2">
      {/* Left: Security banner */}
      <aside className="relative hidden overflow-hidden bg-forest-950 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14 2xl:p-20">
        <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-10" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-forest-500),transparent)] opacity-15" />

        <div className="relative">
          <Logo light />
        </div>

        <div className="relative max-w-md">
          <Reveal immediate delay={100}>
            <span className="inline-flex items-center gap-2 rounded-full border border-forest-700/50 bg-forest-900/60 px-4 py-1.5 text-xs font-semibold tracking-wider text-spark-400">
              <ShieldIcon className="h-4 w-4 text-spark-400" />
              Administrative Console
            </span>
          </Reveal>

          <Reveal immediate delay={200}>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white xl:text-5xl">
              Platform Governance &amp; Administration
            </h1>
          </Reveal>

          <Reveal immediate delay={300}>
            <p className="mt-4 text-base leading-relaxed text-forest-200">
              Manage student enrollments, faculty profiles, role permissions, and platform-wide analytics in one centralized dashboard.
            </p>
          </Reveal>

          <Reveal immediate delay={400}>
            <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-forest-100 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Real-time Firestore role synchronization</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Audit logging and access controls enabled</span>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="relative flex items-center justify-between text-xs text-forest-300">
          <span>Nuels Administrative Core v2.0</span>
          <span>Encrypted Session</span>
        </div>
      </aside>

      {/* Right: Login form */}
      <main className="relative flex flex-col justify-between bg-white px-4 py-6 text-slate-800 sm:px-8 lg:px-12 xl:px-20">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
          >
            ← Back to site
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-8">
          <AdminLoginForm />
        </div>

        <p className="text-center text-xs text-slate-400">
          Authorized personnel only. All access attempts are logged and audited.
        </p>
      </main>
    </div>
  );
}
