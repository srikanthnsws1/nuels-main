import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import TutorLoginForm from "@/components/TutorLoginForm";
import Logo from "@/components/Logo";
import { BookIcon } from "@/components/icons";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Tutor & Instructor Login | Nuels",
  description: "Sign in to the Nuels mentor portal to manage your courses, scheduled live sessions, and learner reviews.",
  robots: { index: false, follow: false },
};

export default function TutorLoginPage() {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      {/* Left: Mentor visual + copy */}
      <aside className="relative hidden overflow-hidden bg-forest-900 lg:block">
        <Image
          src="/images/trust-mentor.webp"
          alt="Mentor conducting an online masterclass"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/75 to-forest-800/40" />
        <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-20" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14 2xl:p-20">
          <Logo light />

          <div className="max-w-lg">
            <Reveal immediate delay={100}>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-spark-400 backdrop-blur">
                <BookIcon className="h-4 w-4 text-spark-400" />
                Faculty &amp; Mentor Hub
              </span>
            </Reveal>

            <Reveal immediate delay={200}>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                Inspire minds, mentor <span className="text-spark-400">future talent</span>
              </h1>
            </Reveal>

            <Reveal immediate delay={300}>
              <p className="mt-4 text-base leading-relaxed text-forest-100 xl:text-lg">
                Your batches, live doubt-clearing sessions, and student portfolio reviews are ready. Empower ambitious learners with real-world industry experience.
              </p>
            </Reveal>

            <Reveal immediate delay={400}>
              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-white">
                <div>
                  <p className="text-2xl font-bold text-spark-400">100%</p>
                  <p className="text-xs text-forest-200">Interactive Sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-spark-400">1:1</p>
                  <p className="text-xs text-forest-200">Portfolio Reviews</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-spark-400">Weekly</p>
                  <p className="text-xs text-forest-200">Scheduled Batches</p>
                </div>
              </div>
            </Reveal>
          </div>

          <p className="text-xs text-forest-300">
            Dedicated portal for verified Nuels instructors &amp; mentors.
          </p>
        </div>
      </aside>

      {/* Right: Login form */}
      <main className="relative flex flex-col justify-between bg-gradient-to-b from-forest-50/50 via-white to-white px-4 py-6 sm:px-8 lg:px-12 xl:px-20">
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
          <TutorLoginForm />
        </div>

        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Nuels · Instructor Portal · Powered by nuelsmart
        </p>
      </main>
    </div>
  );
}
