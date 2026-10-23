import Image from "next/image";
import SectionHeading from "./SectionHeading";
import { CalendarIcon, GlobeIcon, GraduationIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { stories } from "@/data/site";

const orbitPeople = [...stories.map((s) => s.image), "/images/trust-mentor.webp", "/images/trust-student.webp"].slice(0, 6);

export default function WhyNuels() {
  return (
    <section className="bg-forest-50/60 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why Nuels"
          title="Why Learn with Nuels"
          subtitle="Mentor-led online courses built around real work: experienced teachers, live support, practical projects and a schedule that fits your life."
        />

        <div className="mt-10 grid gap-6 sm:mt-14 md:grid-cols-2 lg:grid-cols-3">
          {/* Column 1 */}
          <Reveal variant="left" className="flex flex-col gap-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl md:aspect-[4/5] lg:aspect-auto lg:flex-1">
              <Image
                src="/images/trust-mentor.webp"
                alt="Mentor teaching on a live video session"
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
                <GraduationIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-forest-950">Experienced Mentors</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Learn from professionals with 10 to 20+ years in their field. Each course is taught by a
                mentor who knows the subject from real work.
              </p>
            </div>
          </Reveal>

          {/* Column 2: community orbit */}
          <Reveal delay={150} className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-6 shadow-sm md:order-last md:col-span-2 lg:order-none lg:col-span-1">
            <div className="relative mx-auto aspect-square w-full max-w-xs sm:max-w-sm">
              <div className="absolute inset-[10%] rounded-full border border-dashed border-forest-200" />
              <div className="absolute inset-[26%] rounded-full border border-dashed border-forest-200" />
              <div className="absolute inset-0 animate-spin-slow">
                {orbitPeople.map((src, i) => {
                  const angle = (i / orbitPeople.length) * 2 * Math.PI;
                  const radius = i % 2 === 0 ? 40 : 24;
                  return (
                    <div
                      key={src}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${50 + radius * Math.cos(angle)}%`,
                        top: `${50 + radius * Math.sin(angle)}%`,
                      }}
                    >
                      {/* counter-rotate so faces stay upright while orbiting */}
                      <Image
                        src={src}
                        alt=""
                        width={56}
                        height={56}
                        className="h-12 w-12 animate-spin-slow rounded-full border-2 border-white object-cover shadow-md [animation-direction:reverse] sm:h-14 sm:w-14"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-forest-700 shadow-lg shadow-forest-700/30">
                <Image src="/images/logo-mark-sm.webp" alt="" width={44} height={44} className="rounded-lg bg-white p-0.5" />
              </div>
            </div>
            <div className="mt-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
                <GlobeIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-forest-950">Supportive Community</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Connect with learners and mentors from across the country. Share projects, ask questions,
                and grow together in a friendly learning space.
              </p>
            </div>
          </Reveal>

          {/* Column 3 */}
          <Reveal variant="right" delay={300} className="flex flex-col gap-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
                <CalendarIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-forest-950">Flexible Learning</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Learn anytime, anywhere at your own pace. Recorded lessons, live doubt sessions and lifetime
                access fit around your schedule.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl md:aspect-[4/5] lg:aspect-auto lg:flex-1">
              <Image
                src="/images/trust-student.webp"
                alt="Student studying on a laptop"
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
