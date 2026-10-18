import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, SparkIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { mentors } from "@/data/site";

const rings = [100, 82, 64, 46];

export default function Cta() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal variant="scale">
        <div className="relative overflow-hidden rounded-3xl bg-forest-700 px-5 py-14 text-center sm:rounded-[2.5rem] sm:px-12 sm:py-20 xl:py-24">
          {/* concentric rings, echoing the hero artwork */}
          {rings.map((size, i) => (
            <div
              key={size}
              className="pointer-events-none absolute left-1/2 top-full aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: `${size * 1.6}%`,
                background: `rgba(255, 255, 255, ${0.03 + i * 0.012})`,
              }}
            />
          ))}
          <SparkIcon className="absolute left-[8%] top-8 h-6 w-6 sm:left-[10%] sm:top-12 sm:h-8 sm:w-8 animate-float text-spark-500" />
          <SparkIcon className="absolute bottom-10 right-[8%] h-8 w-8 sm:bottom-16 sm:right-[12%] sm:h-12 sm:w-12 animate-float text-spark-400 [animation-delay:1s]" />

          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto flex w-fit -space-x-3">
              {mentors.map((m) => (
                <Image
                  key={m.name}
                  src={m.image}
                  alt={m.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full border-2 border-forest-700 object-cover"
                />
              ))}
            </div>
            <h2 className="mt-6 text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">Ready to Start Learning?</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-forest-100">
              Build real, job-ready skills with experienced mentors. Pick a course today and
              take the first step towards your goals.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-spark-500 px-7 py-3.5 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400"
              >
                Explore Courses
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/mentors"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Meet the Mentors
              </Link>
            </div>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
