import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cta from "@/components/Cta";
import { CourseEnrollCard, CourseFacts, CourseMentor, CourseMentorBio } from "@/components/CourseLive";
import { CheckIcon, PlusIcon } from "@/components/icons";
import Reveal from "@/components/motion/Reveal";
import { courseDetails } from "@/data/courseDetails";
import { courses } from "@/data/site";
import { breadcrumbSchema, courseSchema, JsonLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

function getCourse(slug: string) {
  const course = courses.find((c) => c.slug === slug);
  const detail = courseDetails[slug];
  return course && detail ? { course, detail } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = getCourse((await params).slug);
  if (!found) return {};
  const { course, detail } = found;
  return pageMetadata({
    title: detail.seoTitle,
    path: `/courses/${course.slug}`,
    description: detail.seoDescription,
    keywords: detail.keywords,
    image: { url: course.image, width: 900, height: 506, alt: course.title },
  });
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const found = getCourse((await params).slug);
  if (!found) notFound();
  const { course, detail } = found;
  const related = courses.filter((c) => c.slug !== course.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", ...courseSchema(course) },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: detail.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
          },
          breadcrumbSchema([
            { name: "Courses", path: "/courses" },
            { name: course.title, path: `/courses/${course.slug}` },
          ]),
        ]}
      />

      {/* hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-50 via-white to-white pb-12 pt-28 sm:pt-36 lg:pb-16 lg:pt-44">
        <div className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-300),transparent)] opacity-30" />
        <div className="pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-forest-200),transparent)] opacity-50" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_400px] lg:items-start lg:px-8">
          <div>
            <Reveal immediate variant="fade">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Link href="/" className="-my-2 py-2 hover:text-forest-700">
                  Home
                </Link>
                <span className="h-1 w-1 rounded-full bg-spark-500" />
                <Link href="/courses" className="-my-2 py-2 hover:text-forest-700">
                  Courses
                </Link>
                <span className="h-1 w-1 rounded-full bg-spark-500" />
                <span className="font-medium text-forest-700">{course.category}</span>
              </nav>
            </Reveal>
            <Reveal immediate delay={100}>
              <h1 className="mt-5 text-[2rem] font-bold leading-tight tracking-tight text-forest-950 sm:text-5xl xl:text-[3.25rem]">
                {detail.keyword} <span className="text-forest-600">with an Expert Mentor</span>
              </h1>
            </Reveal>
            <Reveal immediate delay={200}>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{detail.intro}</p>
            </Reveal>
            <Reveal immediate delay={300}>
              <CourseFacts slug={course.slug} />
            </Reveal>
            <Reveal immediate delay={380}>
              <CourseMentor slug={course.slug} />
            </Reveal>
          </div>

          {/* enroll card */}
          <Reveal variant="scale" delay={200} className="lg:sticky lg:top-28">
            <CourseEnrollCard slug={course.slug} priority />
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-16 lg:max-w-[calc(100%-440px)]">
          {/* outcomes */}
          <section aria-labelledby="learn">
            <h2 id="learn" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              What you&apos;ll learn
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {detail.outcomes.map((o) => (
                <li key={o} className="flex gap-3 rounded-2xl border border-forest-100 bg-white p-4 text-sm leading-relaxed text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-spark-400">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {o}
                </li>
              ))}
            </ul>
          </section>

          {/* curriculum */}
          <section aria-labelledby="curriculum">
            <h2 id="curriculum" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              Course curriculum
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {detail.modules.length} modules · {course.lessons} lessons · {course.hours} hours
            </p>
            <div className="mt-6 space-y-3">
              {detail.modules.map((m, i) => (
                <details key={m.title} open={i === 0} className="group rounded-2xl border border-forest-100 bg-white open:border-forest-300 open:shadow-lg open:shadow-forest-900/5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">{i + 1}</span>
                      <span className="font-semibold text-forest-950">{m.title}</span>
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition group-open:rotate-45 group-open:bg-forest-700 group-open:text-spark-400">
                      <PlusIcon className="h-4 w-4" />
                    </span>
                  </summary>
                  <ul className="space-y-2 px-5 pb-5 pl-16 text-sm text-slate-600">
                    {m.topics.map((t) => (
                      <li key={t} className="list-disc">
                        {t}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {/* audience + tools */}
          <section aria-labelledby="audience" className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl bg-forest-50/70 p-6">
              <h2 id="audience" className="text-lg font-bold text-forest-950">
                Who this course is for
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                {detail.audience.map((a) => (
                  <li key={a} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-spark-500" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-forest-50/70 p-6">
              <h2 className="text-lg font-bold text-forest-950">Tools you&apos;ll use</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {detail.tools.map((t) => (
                  <li key={t} className="rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-forest-800 shadow-sm">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* mentor */}
          <CourseMentorBio slug={course.slug} />

          {/* faqs */}
          <section aria-labelledby="course-faq">
            <h2 id="course-faq" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              {course.title}: common questions
            </h2>
            <div className="mt-6 space-y-3">
              {detail.faqs.map((f) => (
                <details key={f.question} className="group rounded-2xl border border-forest-100 bg-white open:border-forest-300">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-forest-950 [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition group-open:rotate-45 group-open:bg-forest-700 group-open:text-spark-400">
                      <PlusIcon className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{f.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              More answers about payments, certificates and refunds on our{" "}
              <Link href="/faq" className="font-semibold text-forest-700 hover:text-forest-500">
                FAQ page
              </Link>
              .
            </p>
          </section>

          {/* related */}
          <section aria-labelledby="related">
            <h2 id="related" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              Related courses
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((c) => (
                <Link key={c.slug} href={`/courses/${c.slug}`} className="group overflow-hidden rounded-2xl border border-forest-100 bg-white p-2 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/10">
                  <div className="relative aspect-video overflow-hidden rounded-xl">
                    <Image src={c.image} alt={c.title} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <p className="p-2 pt-3 text-sm font-semibold leading-snug text-forest-950">{c.title}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Cta />
    </>
  );
}
