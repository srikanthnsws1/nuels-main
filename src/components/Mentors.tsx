"use client";

import SectionHeading from "./SectionHeading";
import { BriefcaseIcon, SocialIcon, UsersIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { initials } from "./dashboard/ui";
import { useMentorProfiles } from "@/lib/mentors";

export default function Mentors({ standalone = false }: { standalone?: boolean }) {
  const mentors = useMentorProfiles();

  return (
    <section id="mentors" className="relative overflow-hidden bg-forest-800 py-20 sm:py-24">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,var(--color-forest-600),transparent)] opacity-40" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!standalone && (
          <SectionHeading
            light
            eyebrow="Our Mentors"
            title="Learn Directly from Industry Experts"
            subtitle="Each course at Nuels is taught by a mentor who has spent years working in that field, so you learn the skills that matter on the job."
          />
        )}

        {mentors === null ? (
          <div className={`grid ${standalone ? "" : "mt-10 sm:mt-14"} gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-white/5" />
            ))}
          </div>
        ) : mentors.length === 0 ? (
          <div className={`${standalone ? "" : "mt-10 sm:mt-14"} flex flex-col items-center rounded-3xl border border-dashed border-white/20 px-6 py-14 text-center`}>
            <UsersIcon className="h-8 w-8 text-spark-400" />
            <p className="mt-3 font-semibold text-white">Our mentors are setting up their profiles</p>
            <p className="mt-1 text-sm text-forest-100">Check back soon to meet the people who teach on Nuels.</p>
          </div>
        ) : (
          <div className={`grid ${standalone ? "" : "mt-10 sm:mt-14"} gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
            {mentors.map((m, i) => (
              <Reveal key={m.uid} delay={(i % 4) * 120}>
                <article className="group rounded-3xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-1 hover:bg-white/10">
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-forest-700">
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL avatar
                      <img src={m.photo} alt={m.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <span className="text-5xl font-bold text-spark-400">{initials(m.name)}</span>
                    )}
                    {m.experience && (
                      <span className="absolute bottom-3 left-3 rounded-full bg-spark-500 px-3 py-1 text-xs font-bold text-forest-900">
                        {m.experience} experience
                      </span>
                    )}
                  </div>
                  <div className="px-2 pb-2 pt-4">
                    <h3 className="text-lg font-semibold text-white">{m.name}</h3>
                    <p className="text-sm text-spark-400">{m.headline}</p>
                    {m.company && (
                      <p className="mt-3 flex items-center gap-2 text-xs text-forest-100">
                        <BriefcaseIcon className="h-3.5 w-3.5" />
                        {m.company}
                      </p>
                    )}
                    {m.linkedin && (
                      <a
                        href={m.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${m.name} on LinkedIn`}
                        className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-spark-500 hover:text-forest-900"
                      >
                        <SocialIcon name="linkedin" className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-center sm:mt-14 sm:p-8 lg:grid-cols-4">
          {[
            ["Daily", "Live Google Meet sessions"],
            ["1:1", "Mentor project reviews"],
            ["Lifetime", "Access to lessons"],
            ["7-day", "Refund policy"],
          ].map(([value, label], i) => (
            <Reveal key={label} variant="scale" delay={i * 100}>
              <p className="text-2xl font-bold text-spark-400 sm:text-3xl lg:text-4xl">{value}</p>
              <p className="mt-1 text-sm text-forest-100">{label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
