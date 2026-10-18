"use client";

import Image from "next/image";
import { useRef } from "react";
import SectionHeading from "./SectionHeading";
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, StarIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { stories } from "@/data/site";

export default function Stories({ standalone = false }: { standalone?: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section id="stories" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!standalone && (
          <SectionHeading
            eyebrow="Success Stories"
            title="Stories from Our Successful Learners"
            subtitle="See how everyday learners became confident professionals with guidance from their Nuels mentors."
          />
        )}

        <div
          ref={track}
          className={
            standalone
              ? "grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"
              : "no-scrollbar mt-10 flex sm:mt-14 snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
          }
        >
          {stories.map((s, i) => (
            <Reveal
              key={s.name}
              variant={standalone ? "up" : "right"}
              delay={i * 120}
              className={standalone ? "" : "w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[calc(25%-1.125rem)]"}
            >
            <article className="group relative aspect-[3/4] overflow-hidden rounded-3xl">
              <Image
                src={s.image}
                alt={s.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 46vw, 78vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/20 to-transparent" />
              <button
                type="button"
                aria-label={`Play ${s.name}'s story`}
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-forest-700 shadow-lg transition group-hover:scale-110 group-hover:bg-spark-500"
              >
                <PlayIcon className="ml-0.5 h-5 w-5" />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="flex text-spark-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="h-3.5 w-3.5" />
                  ))}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/90">&ldquo;{s.quote}&rdquo;</p>
                <p className="mt-3 font-semibold text-white">{s.name}</p>
                <p className="text-xs text-spark-400">{s.role}</p>
              </div>
            </article>

            </Reveal>
          ))}
        </div>

        <div className={`mt-6 justify-center gap-3 lg:hidden ${standalone ? "hidden" : "flex"}`}>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Previous story"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-forest-200 text-forest-700 hover:bg-forest-50"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Next story"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-700 text-white hover:bg-forest-600"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
