import Image from "next/image";
import Link from "next/link";
import SectionHeading from "./SectionHeading";
import { ArrowUpRightIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { categories } from "@/data/site";

export default function Categories() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Categories"
          title="Explore Our Top Course Categories"
          subtitle="Discover a wide range of learning paths, from design to development and business, each led by a mentor with years of industry experience."
        />

        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <Reveal key={cat.title} delay={(i % 3) * 120}>
            <Link href="/courses" className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <span className="absolute right-4 top-4 flex h-11 w-11 scale-75 items-center justify-center rounded-full bg-spark-500 text-forest-900 opacity-0 transition duration-300 group-hover:scale-100 group-hover:opacity-100">
                  <ArrowUpRightIcon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-forest-950">{cat.title}</h3>
                <p className="text-sm text-slate-500">{cat.tagline}</p>
              </div>
            </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
