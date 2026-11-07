import { StarIcon } from "./icons";
import { highWeightage, paperDesign, percentOf, theoryMarks, units } from "@/data/class10Maths";

/** Unit-wise board marks for Class 10 Maths, with the highest-scoring units highlighted, plus the paper pattern. */
export default function MarksWeightage({ chapterCount }: { chapterCount: (roman: string) => number }) {
  const top = Math.max(...units.map((u) => u.marks));
  const internal = paperDesign.internal.reduce((s, i) => s + i.marks, 0);
  return (
    <section aria-labelledby="weightage" className="mx-auto max-w-5xl px-4 pb-14 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-forest-100 bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="weightage" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              Marks weightage by unit
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              CBSE board exam 2026-27 · {theoryMarks} marks theory paper ({paperDesign.time}) + {internal} marks internal assessment.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-spark-500/25 px-3 py-1.5 text-xs font-bold text-forest-900">
            <StarIcon className="h-3.5 w-3.5" /> High weightage = focus first
          </span>
        </div>

        <ul className="mt-6 space-y-3">
          {units.map((u) => {
            const high = highWeightage.has(u.roman);
            const n = chapterCount(u.roman);
            return (
              <li key={u.roman} className={`rounded-2xl p-3 sm:p-4 ${high ? "bg-spark-500/10 ring-1 ring-spark-500/60" : "bg-forest-50/50"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-sm font-semibold text-forest-950">
                    Unit {u.roman}: {u.name}
                    <span className="ml-2 font-normal text-slate-500">
                      {n} {n === 1 ? "chapter" : "chapters"}
                    </span>
                    {high && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-spark-500 px-2 py-0.5 align-middle text-[11px] font-bold text-forest-900">
                        <StarIcon className="h-3 w-3" /> High weightage
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-bold text-forest-950">
                    {u.marks} marks <span className="font-semibold text-forest-600">· {percentOf(u.marks)}</span>
                  </p>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
                  <div className={`h-full rounded-full ${high ? "bg-spark-500" : "bg-forest-600"}`} style={{ width: `${(u.marks / top) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          The board sets marks per unit, not per chapter: chapters in the same unit share that unit&apos;s marks. Percentages are of the {theoryMarks}-mark theory paper.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="font-bold text-forest-950">Question paper design</h3>
            <ul className="mt-3 divide-y divide-forest-100 rounded-2xl border border-forest-100">
              {paperDesign.rows.map((r) => (
                <li key={r.type} className="flex items-start justify-between gap-4 p-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-forest-950">{r.type}</span>
                    <span className="block text-xs text-slate-500">{r.detail}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-bold text-forest-950">
                    {r.marks} <span className="block text-xs font-semibold text-forest-600">{r.percent}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-forest-950">Internal assessment · {internal} marks</h3>
            <ul className="mt-3 divide-y divide-forest-100 rounded-2xl border border-forest-100">
              {paperDesign.internal.map((i) => (
                <li key={i.item} className="flex items-center justify-between gap-4 p-3 text-sm">
                  <span className="text-slate-700">{i.item}</span>
                  <span className="shrink-0 font-bold text-forest-950">{i.marks}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
