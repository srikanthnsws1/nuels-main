import { Card, CardTitle } from "../dashboard/ui";
import { CheckIcon, StarIcon } from "../icons";
import { chapterSyllabus, highWeightage, percentOf, theoryMarks, unitFor, type ChapterSyllabus as Syllabus, type Point } from "@/data/class10Maths";
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

const text = (p: Point) => (typeof p === "string" ? p : p.text);

function SubPoints({ p }: { p: Point }) {
  if (typeof p === "string") return null;
  return (
    <ul className="mt-1.5 space-y-1 pl-1">
      {p.sub.map((x) => (
        <li key={x} className="flex items-center gap-2 text-sm text-slate-600">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-spark-500" />
          {x}
        </li>
      ))}
    </ul>
  );
}

function Points({ items }: { items: Point[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((p) => (
        <li key={text(p)} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
          <CheckIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-forest-600" />
          <span>
            {text(p)}
            <SubPoints p={p} />
          </span>
        </li>
      ))}
    </ul>
  );
}

const heading = "text-sm font-bold uppercase tracking-wider text-forest-600";

/** The complete syllabus for one chapter: topics, theorems, competencies and expected learning outcomes. */
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

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-forest-100 p-4 lg:col-span-2">
          <h3 className={heading}>Topics{s.topicsHeading ? `: ${s.topicsHeading}` : ""}</h3>
          {s.topics.length > 0 && (
            <ol className="mt-3 space-y-3">
              {s.topics.map((p, i) => (
                <li key={text(p)} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-spark-400">{i + 1}</span>
                  <span className="pt-0.5">
                    {text(p)}
                    <SubPoints p={p} />
                  </span>
                </li>
              ))}
            </ol>
          )}
          {s.theorems && (
            <>
              {s.topics.length > 0 && <h4 className={`${heading} mt-6`}>Theorems and statements</h4>}
              <ol className="mt-3 space-y-3">
                {s.theorems.map((t, i) => (
                  <li key={i} className="rounded-xl bg-forest-50/70 p-3 text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold text-forest-950">
                      {i + 1}. {t.label}:
                    </span>{" "}
                    {t.text}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
        <section className="rounded-2xl bg-forest-50/60 p-4">
          <h3 className={heading}>Competencies</h3>
          <Points items={s.competencies} />
        </section>
        <section className="rounded-2xl bg-spark-500/10 p-4">
          <h3 className={heading}>Expected learning outcomes</h3>
          <Points items={s.outcomes} />
        </section>
      </div>
    </Card>
  );
}
