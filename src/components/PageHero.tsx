import Link from "next/link";
import type { ReactNode } from "react";
import { SparkIcon } from "./icons";
import Reveal from "./motion/Reveal";

/** Header band for inner pages — same gradient, glows and type scale as the home hero. */
export default function PageHero({
  eyebrow,
  title,
  highlight,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-forest-50 via-white to-white pb-10 pt-28 sm:pb-16 sm:pt-36 lg:pt-44">
      <div className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-300),transparent)] opacity-30" />
      <div className="pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-forest-200),transparent)] opacity-50" />
      <SparkIcon className="pointer-events-none absolute right-[12%] top-36 hidden h-10 w-10 animate-float text-spark-500 drop-shadow sm:block" />
      <SparkIcon className="pointer-events-none absolute left-[14%] top-56 hidden h-6 w-6 animate-float text-forest-400 [animation-delay:1.5s] sm:block" />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal immediate variant="fade">
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Link href="/" className="-my-2 py-2 hover:text-forest-700">
              Home
            </Link>
            <span className="h-1 w-1 rounded-full bg-spark-500" />
            <span className="font-medium text-forest-700">{eyebrow}</span>
          </nav>
        </Reveal>

        <Reveal immediate delay={120}>
          <h1 className="mx-auto mt-6 max-w-3xl text-[2rem] font-bold leading-tight tracking-tight text-forest-950 sm:text-5xl lg:text-6xl 2xl:max-w-4xl 2xl:text-7xl">
            {title} {highlight && <span className="text-forest-600">{highlight}</span>}
          </h1>
        </Reveal>
        <Reveal immediate delay={240}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{subtitle}</p>
        </Reveal>

        {children && <Reveal immediate delay={360}>{children}</Reveal>}
      </div>
    </section>
  );
}
