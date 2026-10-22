import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import RegisterForm from "@/components/RegisterForm";
import Reveal from "@/components/motion/Reveal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create Account",
  path: "/register",
  description: "Sign up for Nuel Smart to start learning high-demand skills or apply to become an industry mentor.",
  noIndex: true,
});

const perks = [
  "Instant access to course catalogs & resources",
  "Mentor-guided live sessions & community discussions",
  "Role-specific dashboards for students & tutors",
];

export default function RegisterPage() {
  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-2">
      {/* Left: photo with the message in a solid card at the bottom (banner on phones) */}
      <aside className="relative h-72 overflow-hidden bg-forest-900 sm:h-96 lg:sticky lg:top-0 lg:h-dvh">
        <Image
          src="/images/trust-student.webp"
          alt="Learner working on a project with a laptop"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-[center_30%]"
        />

        <div className="relative flex h-full flex-col justify-between p-4 sm:p-6 lg:p-10 xl:p-14">
          <div className="w-fit rounded-2xl bg-forest-950/75 px-3 py-2">
            <Logo light />
          </div>

          <Reveal immediate delay={100}>
            <div className="max-w-xl rounded-3xl bg-forest-950/85 p-5 shadow-2xl sm:p-6 xl:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-spark-400">Join the Nuel Smart community</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl xl:text-4xl">
                Start your journey with <span className="text-spark-400">real practitioners</span>
              </h1>
              <p className="mt-3 hidden text-sm leading-relaxed text-white/90 sm:block xl:text-base">
                Register as a learner or share your craft as an industry mentor. Everything is practical, project-based and
                career-focused.
              </p>
              <ul className="mt-5 hidden space-y-2.5 lg:block">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-3 text-sm font-medium text-white">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-spark-500 text-xs font-bold text-forest-950">
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </aside>

      {/* Right: Registration Form */}
      <main className="relative flex flex-col gap-6 bg-white lg:min-h-dvh lg:justify-between lg:gap-0 px-4 py-6 sm:px-8 lg:px-12 xl:px-20">
        <div className="flex items-center justify-end">
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
          >
            ← Back to site
          </Link>
        </div>

        <div className="mx-auto w-full max-w-lg py-2 lg:my-auto lg:py-8">
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading registration…</div>}>
            <RegisterForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} nuelsmart · All rights reserved · Privacy Policy · Terms
        </p>
      </main>
    </div>
  );
}
