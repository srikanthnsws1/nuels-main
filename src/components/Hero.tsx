import Image from "next/image";
import { CalendarIcon, SearchIcon, SparkIcon } from "./icons";
import Parallax from "./motion/Parallax";
import Reveal from "./motion/Reveal";

const learnerAvatars = ["/images/story-ananya.webp", "/images/story-rohan.webp", "/images/story-meera.webp"];

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-forest-50 via-white to-white pt-28 sm:pt-36 lg:pt-40">
      {/* soft background glows */}
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-300),transparent)] opacity-30" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-forest-200),transparent)] opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal immediate variant="fade">
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-100 bg-white px-4 py-1.5 text-xs font-semibold text-forest-700 shadow-sm">
            <SparkIcon className="h-3.5 w-3.5 text-spark-500" />
            Every course taught by an industry mentor
          </span>
        </Reveal>

        <Reveal immediate delay={120}>
          <h1 className="mx-auto mt-6 max-w-3xl text-[2rem] font-bold leading-tight tracking-tight text-forest-950 sm:text-5xl lg:text-6xl 2xl:max-w-4xl 2xl:text-7xl">
            Online Courses Taught by <span className="text-forest-600">Experienced Mentors</span>
          </h1>
        </Reveal>
        <Reveal immediate delay={240}>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Every Nuels course is taught by a mentor who has done the work in the real world. Learn practical
            skills in UI/UX design, web development, data analysis, digital marketing, business and spoken English, at your own pace, from anywhere in India.
          </p>
        </Reveal>

        <Reveal immediate delay={360}>
          <form className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-forest-100 bg-white p-1.5 pl-4 shadow-xl sm:pl-5 shadow-forest-900/5 transition focus-within:border-forest-300 focus-within:shadow-forest-900/10">
            <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              type="search"
              placeholder="What do you want to learn today?"
              aria-label="Search courses"
              className="w-full min-w-0 bg-transparent py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-forest-700 px-4 py-2.5 sm:px-5 text-sm font-semibold text-white transition hover:bg-forest-600"
            >
              Search
            </button>
          </form>
        </Reveal>
      </div>

      <div className="relative mx-auto mt-8 max-w-6xl px-4 2xl:max-w-7xl sm:px-6 lg:px-8">
        <Reveal immediate variant="scale" delay={300}>
          <Parallax speed={-0.06}>
            <Image
              src="/images/hero.webp"
              alt="Smiling student holding a book, ready to learn with Nuels"
              width={1376}
              height={768}
              priority
              className="mx-auto h-auto w-full [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent),linear-gradient(to_bottom,transparent,black_18%)]"
            />
          </Parallax>
        </Reveal>

        <Parallax speed={-0.25} className="absolute right-[14%] top-[12%]">
          <SparkIcon className="h-10 w-10 animate-float text-spark-500 drop-shadow sm:h-14 sm:w-14" />
        </Parallax>
        <Parallax speed={-0.35} className="absolute left-[18%] top-[30%] hidden sm:block">
          <SparkIcon className="h-6 w-6 animate-float text-forest-400 [animation-delay:1.5s]" />
        </Parallax>

        {/* rating card */}
        <Parallax speed={-0.18} className="absolute bottom-[14%] left-4 hidden md:block lg:left-10 xl:left-16">
          <Reveal immediate variant="left" delay={700}>
            <div className="w-48 animate-float lg:w-56 rounded-2xl bg-white p-4 text-left shadow-xl shadow-forest-900/10 [animation-delay:0.8s]">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700 text-spark-400">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <span className="text-lg font-bold text-forest-900">Live every week</span>
              </div>
              <p className="mt-2 text-xs leading-snug text-slate-500">
                Doubt-clearing sessions with your mentor, on top of self-paced lessons
              </p>
            </div>
          </Reveal>
        </Parallax>

        {/* learners card */}
        <Parallax speed={-0.28} className="absolute right-4 top-[38%] hidden md:block lg:right-10 xl:right-16">
          <Reveal immediate variant="right" delay={850}>
            <div className="w-52 animate-float lg:w-60 rounded-2xl bg-white p-4 text-left shadow-xl shadow-forest-900/10">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {learnerAvatars.map((src) => (
                    <Image
                      key={src}
                      src={src}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <span className="text-lg font-bold leading-tight text-forest-900">Real projects</span>
              </div>
              <p className="mt-2 text-xs leading-snug text-slate-500">
                Build a portfolio with feedback from mentors who do this work daily
              </p>
            </div>
          </Reveal>
        </Parallax>
      </div>
    </section>
  );
}
