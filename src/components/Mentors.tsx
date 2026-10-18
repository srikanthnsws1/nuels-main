import Image from "next/image";
import SectionHeading from "./SectionHeading";
import { BriefcaseIcon, SocialIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { mentors } from "@/data/site";

export default function Mentors({ standalone = false }: { standalone?: boolean }) {
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

        <div className={`grid ${standalone ? "" : "mt-10 sm:mt-14"} gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
          {mentors.map((m, i) => (
            <Reveal key={m.name} delay={i * 120}>
            <article
              className="group rounded-3xl border border-white/10 bg-white/5 p-3 transition hover:-translate-y-1 hover:bg-white/10"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <Image
                  src={m.image}
                  alt={m.name}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-spark-500 px-3 py-1 text-xs font-bold text-forest-900">
                  {m.experience} experience
                </span>
              </div>
              <div className="px-2 pb-2 pt-4">
                <h3 className="text-lg font-semibold text-white">{m.name}</h3>
                <p className="text-sm text-spark-400">{m.role}</p>
                <div className="mt-3 space-y-1.5 text-xs text-forest-100">
                  <p className="flex items-center gap-2">
                    <BriefcaseIcon className="h-3.5 w-3.5" />
                    {m.company}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  {(["linkedin", "instagram"] as const).map((s) => (
                    <a
                      key={s}
                      href="#"
                      aria-label={`${m.name} on ${s}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-spark-500 hover:text-forest-900"
                    >
                      <SocialIcon name={s} className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </article>

            </Reveal>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-center sm:mt-14 sm:p-8 lg:grid-cols-4">
          {[
            ["Weekly", "Live doubt sessions"],
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
