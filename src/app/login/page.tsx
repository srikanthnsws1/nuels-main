import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import Logo from "@/components/Logo";
import { SparkIcon, StarIcon } from "@/components/icons";
import Reveal from "@/components/motion/Reveal";
import { stories } from "@/data/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Log in",
  path: "/login",
  description: "Log in to your Nuels account to continue your courses, join live mentor sessions and track your progress.",
  noIndex: true,
});

const testimonial = stories[0];

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      {/* left: image + story */}
      <aside className="relative hidden overflow-hidden lg:block">
        <Image
          src="/images/trust-student.webp"
          alt="Student learning on a laptop"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/70 to-forest-800/40" />
        <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-20" />
        <SparkIcon className="absolute right-[14%] top-[18%] h-12 w-12 animate-float text-spark-500 drop-shadow" />
        <SparkIcon className="absolute left-[12%] top-[38%] h-6 w-6 animate-float text-spark-300 [animation-delay:1.5s]" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14 2xl:p-20">
          <Logo light />

          <div className="max-w-lg">
            <Reveal immediate delay={100}>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-spark-400 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-spark-500" />
                Welcome back
              </span>
            </Reveal>
            <Reveal immediate delay={200}>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                Pick up right where you <span className="text-spark-400">left off</span>
              </h1>
            </Reveal>
            <Reveal immediate delay={300}>
              <p className="mt-4 text-base leading-relaxed text-forest-100 xl:text-lg">
                Your lessons, live sessions and mentor feedback are waiting. Keep building real skills with the
                people who&apos;ve done the work.
              </p>
            </Reveal>

            <Reveal immediate delay={420}>
              <figure className="mt-10 rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
                <div className="flex text-spark-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-white/90">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <Image
                    src={testimonial.image}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-white/40 object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                    <p className="text-xs text-spark-400">{testimonial.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          </div>

          <div className="flex gap-10 text-white">
            {[
              ["Weekly", "Live sessions"],
              ["1:1", "Project reviews"],
              ["Lifetime", "Course access"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold text-spark-400">{value}</p>
                <p className="text-xs text-forest-200">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* right: form */}
      <main className="relative flex flex-col overflow-hidden bg-gradient-to-b from-forest-50 via-white to-white px-4 py-6 sm:px-8 lg:bg-none lg:px-12 xl:px-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-300),transparent)] opacity-30 lg:hidden" />

        <div className="relative flex items-center justify-between">
          <div className="lg:invisible">
            <Logo />
          </div>
          <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50">
            ← Back to site
          </Link>
        </div>

        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 sm:py-16">
          <LoginForm />
        </div>

        <p className="relative text-center text-xs text-slate-400">
          © {new Date().getFullYear()} nuelsmart · Privacy Policy · Terms &amp; Conditions
        </p>
      </main>
    </div>
  );
}
