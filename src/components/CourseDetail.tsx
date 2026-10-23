"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import EnrollButton from "./EnrollButton";
import MentorBadge from "./MentorBadge";
import { ArrowRightIcon, BookIcon, BriefcaseIcon, CalendarIcon, CheckIcon, ClockIcon, GraduationIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { initials } from "./dashboard/ui";
import { courseImage, coursePath, getCourse, rupee, useCourses, type Course } from "@/lib/courses";
import { getMentorProfile, type MentorProfile } from "@/lib/mentors";

type State = { status: "loading" } | { status: "missing" } | { status: "ready"; course: Course; mentor: MentorProfile | null };

export default function CourseDetail() {
  const id = useSearchParams().get("id") ?? "";
  const [state, setState] = useState<State>({ status: "loading" });
  const { courses } = useCourses();

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    if (!id) {
      setState({ status: "missing" });
      return;
    }
    getCourse(id)
      .then(async (course) => {
        if (!course) return live && setState({ status: "missing" });
        const mentor = await getMentorProfile(course.mentorId).catch(() => null);
        if (live) setState({ status: "ready", course, mentor });
      })
      .catch(() => live && setState({ status: "missing" }));
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    if (state.status === "ready") document.title = `${state.course.title} | Nuels`;
  }, [state]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-28">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" aria-label="Loading" />
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 pt-28 text-center">
        <h1 className="text-2xl font-bold text-forest-950">Course not found</h1>
        <p className="mt-2 text-sm text-slate-600">This course may have been removed by its mentor.</p>
        <Link href="/courses" className="mt-6 rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white hover:bg-forest-600">
          Browse all courses
        </Link>
      </div>
    );
  }

  const { course, mentor } = state;
  const related = (courses ?? []).filter((c) => c.id !== course.id).slice(0, 3);
  const discount = course.oldPrice && course.oldPrice > course.price ? Math.round((1 - course.price / course.oldPrice) * 100) : 0;

  const facts = [
    { icon: BookIcon, label: `${course.lessons} lessons` },
    { icon: ClockIcon, label: `${course.hours} hours of content` },
    { icon: GraduationIcon, label: `${course.level} level` },
    { icon: CalendarIcon, label: "Live Google Meet sessions" },
  ];

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-50 via-white to-white pb-12 pt-28 sm:pt-36 lg:pb-16 lg:pt-44">
        <div className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-300),transparent)] opacity-30" />
        <div className="pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-forest-200),transparent)] opacity-50" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_400px] lg:items-start lg:px-8">
          <div>
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
            <h1 className="mt-5 text-[2rem] font-bold leading-tight tracking-tight text-forest-950 sm:text-5xl xl:text-[3.25rem]">
              {course.title}
            </h1>
            <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-slate-600 sm:text-lg">{course.description}</p>
            <ul className="mt-7 flex flex-wrap gap-2">
              {facts.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-2 rounded-full border border-forest-100 bg-white px-4 py-2 text-sm font-medium text-forest-800 shadow-sm">
                  <Icon className="h-4 w-4 text-forest-600" />
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <p className="mb-2 text-sm text-slate-500">Taught by</p>
              <MentorBadge course={course} size="md" />
            </div>
          </div>

          {/* enroll card */}
          <Reveal variant="scale" delay={200} className="lg:sticky lg:top-28">
            <aside className="overflow-hidden rounded-3xl border border-forest-100 bg-white p-3 shadow-xl shadow-forest-900/10">
              <div className="relative aspect-video overflow-hidden rounded-2xl">
                <Image src={courseImage(course)} alt={`${course.title} course preview`} fill priority sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
              </div>
              <div className="p-3 pt-5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-bold text-forest-950">{course.price ? rupee.format(course.price) : "Free"}</span>
                  {discount > 0 && (
                    <>
                      <span className="text-slate-400 line-through">{rupee.format(course.oldPrice!)}</span>
                      <span className="rounded-full bg-spark-500/20 px-2.5 py-0.5 text-xs font-bold text-forest-800">{discount}% off</span>
                    </>
                  )}
                </div>
                <EnrollButton
                  course={course}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600"
                >
                  Enroll Now <ArrowRightIcon className="h-4 w-4" />
                </EnrollButton>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                  {["Lifetime access to lessons", "Daily live sessions on Google Meet", "Mentor-reviewed projects", "7-day refund policy"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <CheckIcon className="h-4 w-4 shrink-0 text-forest-600" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-16 lg:max-w-[calc(100%-440px)]">
          {course.outcomes.length > 0 && (
            <section aria-labelledby="learn">
              <h2 id="learn" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
                What you&apos;ll learn
              </h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-3 rounded-2xl border border-forest-100 bg-white p-4 text-sm leading-relaxed text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-spark-400">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.curriculum.length > 0 && (
            <section aria-labelledby="curriculum">
              <h2 id="curriculum" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
                Course curriculum
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {course.curriculum.length} modules · {course.lessons} lessons · {course.hours} hours
              </p>
              <ol className="mt-6 space-y-3">
                {course.curriculum.map((m, i) => (
                  <li key={`${i}-${m}`} className="flex items-center gap-3 rounded-2xl border border-forest-100 bg-white px-5 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">{i + 1}</span>
                    <span className="font-semibold text-forest-950">{m}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* mentor */}
            <section aria-labelledby="mentor" className="relative overflow-hidden rounded-3xl bg-forest-800 p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-10" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <MentorAvatar name={course.mentorName} photo={course.mentorPhoto ?? mentor?.photo} className="h-28 w-28 shrink-0 rounded-2xl text-3xl" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-spark-400">Your mentor</p>
                  <h2 id="mentor" className="mt-1 text-2xl font-bold text-white">
                    {course.mentorName}
                  </h2>
                  <p className="text-sm text-forest-100">{course.mentorDesignation || mentor?.headline}</p>
                  {mentor && (mentor.experience || mentor.company) && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-forest-100">
                      <BriefcaseIcon className="h-4 w-4 text-spark-400" />
                      {[mentor.experience && `${mentor.experience} experience`, mentor.company].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {mentor?.bio && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-forest-100">{mentor.bio}</p>}
                  <Link href="/mentors" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-spark-400 hover:text-spark-300">
                    Meet all mentors <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>

          <section aria-labelledby="course-faq">
            <h2 id="course-faq" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              Questions about this course?
            </h2>
            <p className="mt-4 text-sm text-slate-500">
              Answers about payments, certificates and refunds are on our{" "}
              <Link href="/faq" className="font-semibold text-forest-700 hover:text-forest-500">
                FAQ page
              </Link>
              , or{" "}
              <Link href="/contact" className="font-semibold text-forest-700 hover:text-forest-500">
                contact us
              </Link>
              .
            </p>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="related">
              <h2 id="related" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
                More courses
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {related.map((c) => (
                  <Link key={c.id} href={coursePath(c.id)} className="group overflow-hidden rounded-2xl border border-forest-100 bg-white p-2 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/10">
                    <div className="relative aspect-video overflow-hidden rounded-xl">
                      <Image src={courseImage(c)} alt={c.title} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <p className="p-2 pt-3 text-sm font-semibold leading-snug text-forest-950">{c.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function MentorAvatar({ name, photo, className }: { name: string; photo?: string; className: string }) {
  return (
    <span className={`flex items-center justify-center overflow-hidden bg-forest-700 font-bold text-spark-400 ${className}`}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL avatar
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
