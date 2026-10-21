import type { ComponentType } from "react";
import type { IconProps } from "../icons";
import Reveal from "../motion/Reveal";

// Building blocks shared by the student, mentor and admin dashboards.

export const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Card({ id, className = "", children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-28 rounded-3xl border border-forest-100 bg-white p-5 sm:p-6 lg:scroll-mt-8 ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold tracking-tight text-forest-950">{title}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-forest-50" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full ${value === 100 ? "bg-spark-500" : "bg-gradient-to-r from-forest-500 to-forest-700"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export type Stat = { label: string; value: React.ReactNode; icon: ComponentType<IconProps> };

export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }, i) => (
        <Reveal immediate key={label} delay={i * 80} className="h-full">
          <div className="flex h-full flex-col gap-4 rounded-3xl border border-forest-100 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-forest-950">{value}</p>
              <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function WelcomeBanner({ id, title, children }: { id: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Reveal immediate>
      <div id={id} className="relative scroll-mt-40 overflow-hidden rounded-3xl bg-forest-700 p-6 sm:p-8 lg:scroll-mt-28 xl:p-10">
        {[100, 78, 56].map((size, i) => (
          <div
            key={size}
            className="pointer-events-none absolute right-0 top-1/2 aspect-square -translate-y-1/2 translate-x-1/3 rounded-full"
            style={{ width: `${size * 0.6}%`, background: `rgba(255,255,255,${0.04 + i * 0.015})` }}
          />
        ))}
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold text-spark-400">{greeting()},</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl xl:text-4xl">{title}</h1>
          {children}
        </div>
      </div>
    </Reveal>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: ComponentType<IconProps>; title: string; children?: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-forest-200 px-4 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 text-forest-700">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-forest-950">{title}</p>
      {children && <div className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{children}</div>}
    </div>
  );
}
