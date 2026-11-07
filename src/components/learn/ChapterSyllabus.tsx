import { Card, CardTitle } from "../dashboard/ui";
import { CheckIcon, StarIcon } from "../icons";
import { chapterSyllabus, highWeightage, percentOf, theoryMarks, unitFor, type ChapterSyllabus as Syllabus } from "@/data/class10Maths";
import type { CatalogCourse } from "@/lib/catalog";

export const hasChapterSyllabus = (slug: string) => slug in chapterSyllabus;

/** "Unit II: Algebra · 20 of 80 marks (25%)" chip row for a subject chapter. */
export function ChapterMarks({ course, dark = false }: { course: CatalogCourse; dark?: boolean }) {
  const unit = unitFor(course.unit);
  if (!unit) return null;
  const high = highWeightage.has(unit.roman);
  const chip = dark ? "bg-white/10 text-white" : "bg-forest-50 text-forest-800";
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip}`}>
        Unit {unit.roman}: {unit.name}
      </span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip}`}>
        {unit.marks}/{theoryMarks} marks · {percentOf(unit.marks)}
      </span>
      {high && (
        <span className="inline-flex items-center gap-1 rounded-full bg-spark-500 px-2.5 py-0.5 text-xs font-bold text-forest-900">
          <StarIcon className="h-3 w-3" /> High weightage
        </span>
      )}
    </span>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
          <CheckIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-forest-600" />
          {t}
        </li>
      ))}
    </ul>
  );
}

/** The board's complete syllabus for one chapter: content, competencies and what the learner should be able to do. */
export default function ChapterSyllabus({ course }: { course: CatalogCourse }) {
  const s: Syllabus | undefined = chapterSyllabus[course.slug];
  if (!s) return null;
  const unit = unitFor(course.unit);
  return (
    <Card id="syllabus">
      <CardTitle title={`Chapter ${course.chapterNo} syllabus`} />
      <div className="mt-3">
        <ChapterMarks course={course} />
      </div>
      {unit && (
        <p className="mt-2 text-xs text-slate-500">
          Board marks are set per unit: this chapter shares Unit {unit.roman}&apos;s {unit.marks} marks with the unit&apos;s other chapters.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-forest-100 p-4 lg:col-span-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-forest-600">Content</h3>
          {s.content.map((block, i) => (
            <div key={i} className={i ? "mt-4" : ""}>
              {block.heading && <p className="mt-2 font-semibold text-forest-950">{block.heading}</p>}
              <ol className="mt-2 space-y-2">
                {block.points.map((t, j) => (
                  <li key={t} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-spark-400">{j + 1}</span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
        <section className="rounded-2xl bg-forest-50/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-forest-600">Competencies</h3>
          <Points items={s.competencies} />
        </section>
        <section className="rounded-2xl bg-spark-500/10 p-4 lg:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-forest-600">What you&apos;ll be able to do</h3>
          <Points items={s.explanation} />
        </section>
      </div>
    </Card>
  );
}
