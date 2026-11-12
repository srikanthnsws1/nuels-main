"use client";

import { Fragment, useEffect, useState } from "react";
import { CheckIcon, ChevronDownIcon, ClipboardIcon, CloseIcon, StarIcon } from "../icons";
import { StatTiles } from "../dashboard/ui";
import { OptionContent, QuizFigure } from "./QuizFigure";
import { dayLabel, paperSections } from "@/data/dailyQuiz";
import { formatDuration, loadBanks, sectionScores, tally, type DailyAttempt, type QuizBank } from "@/lib/dailyQuiz";

const letters = ["a", "b", "c", "d"];
const pctTone = (p: number) => (p >= 80 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : p >= 60 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700");

/** Section scores and every question with the learner's answer, for one past paper. */
export function PaperReview({ attempt }: { attempt: DailyAttempt }) {
  const [banks, setBanks] = useState<Record<string, QuizBank> | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    loadBanks(attempt.group, Object.keys(attempt.picks)).then(
      (b) => live && setBanks(b),
      () => live && setBanks(null),
    );
    return () => {
      live = false;
    };
  }, [attempt.group, attempt.picks]);

  const scores = sectionScores(attempt);
  const sections = paperSections(attempt.group, Object.keys(attempt.picks));
  const bankIds = sections.map((s) => s.bankId);
  let no = 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {sections.map((s) => (
          <div key={s.bankId} className={`rounded-xl border border-forest-100 p-3 ${s.soft}`}>
            <p className={`text-xs font-semibold ${s.text}`}>
              {s.letter}. {s.title}
            </p>
            <p className="mt-1 text-lg font-bold text-forest-950">
              {scores[s.bankId] ?? 0} / {attempt.picks[s.bankId].length}
            </p>
          </div>
        ))}
      </div>
      {banks === undefined ? (
        <p className="text-sm text-slate-500">Loading questions…</p>
      ) : banks === null ? (
        <p className="text-sm text-slate-500">The questions for this paper are no longer available.</p>
      ) : (
        <ol className="grid gap-x-6 md:grid-cols-2">
          {bankIds.flatMap((b) =>
            attempt.picks[b].map((n, i) => {
              no++;
              const q = banks[b]?.questions[n];
              const yours = attempt.answers?.[b]?.[i];
              const right = attempt.correct?.[b]?.[i];
              const ok = yours !== null && yours !== undefined && yours === right;
              if (!q) return null;
              return (
                <li key={`${b}-${n}`} className="flex gap-2.5 border-b border-forest-100 py-2.5 text-sm">
                  {ok ? <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <CloseIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                  <span className="min-w-0">
                    <span className="font-medium text-forest-950">
                      {no}. {q.q}
                      {q.f && <QuizFigure svg={q.f} alt={`Figure for question ${no}`} className="mt-1 h-auto max-h-20 w-auto max-w-full" />}
                    </span>
                    <span className="block text-xs text-slate-500">
                      Your answer:{" "}
                      {yours === null || yours === undefined ? (
                        <span className="font-semibold text-slate-400">not answered</span>
                      ) : (
                        <span className={`font-semibold ${ok ? "text-emerald-700" : "text-red-600"}`}>
                          {letters[yours]}) <OptionContent value={q.o[yours]} small />
                        </span>
                      )}
                      {!ok && right !== undefined && (
                        <>
                          {" "}
                          · Correct:{" "}
                          <span className="font-semibold text-emerald-700">
                            {letters[right]}) <OptionContent value={q.o[right]} small />
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                </li>
              );
            }),
          )}
        </ol>
      )}
    </div>
  );
}

/** Totals and the table of submitted papers, each with a Review drop-down. */
export default function QuizHistory({ attempts }: { attempts: DailyAttempt[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const scored = attempts.filter((a) => a.score !== undefined);
  const pcts = scored.map((a) => tally(a).pct);
  const stats = [
    { label: "Quizzes submitted", value: attempts.length, icon: ClipboardIcon },
    { label: "Best score", value: pcts.length ? `${Math.max(...pcts)}%` : "—", icon: StarIcon },
    { label: "Average score", value: pcts.length ? `${Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length)}%` : "—", icon: CheckIcon },
    { label: "Total points", value: scored.reduce((s, a) => s + (a.score ?? 0), 0), icon: StarIcon },
  ];

  return (
    <>
      <StatTiles stats={stats} />
      <section className="min-w-0 overflow-hidden rounded-3xl border border-forest-100 bg-white">
        <div className="flex items-center justify-between bg-forest-900 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Submitted quiz results</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-forest-100">Read only</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-forest-50/60 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                {["#", "Submitted", "Quiz ID", "Attempted", "Correct", "Wrong", "Score", "Percent", "Time taken", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {attempts.map((a, i) => {
                const t = tally(a);
                const isOpen = open === a.id;
                return (
                  <Fragment key={a.id}>
                    <tr>
                      <td className="px-4 py-3 text-slate-500">{attempts.length - i}</td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-forest-950">{dayLabel(a.day)}</span>
                        <span className="text-xs text-slate-500">
                          {a.submittedAt?.toDate().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-mono text-xs font-semibold text-forest-800">{a.code}</span>
                        <span className="text-xs text-slate-500">Group {a.group}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-700">
                        {t.attempted} / {t.total}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{a.correct ? t.correct : "—"}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">{a.correct ? t.wrong : "—"}</td>
                      <td className="px-4 py-3 font-bold text-forest-950">{a.score !== undefined ? `${a.score} / ${t.total}` : "Checking…"}</td>
                      <td className="px-4 py-3">
                        {a.score !== undefined && <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${pctTone(t.pct)}`}>{t.pct}%</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDuration(a.timeTaken)}</td>
                      <td className="px-4 py-3 text-right">
                        {a.correct && (
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : a.id)}
                            aria-expanded={isOpen}
                            className="inline-flex items-center gap-1 rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold text-forest-700 hover:bg-forest-50"
                          >
                            {isOpen ? "Hide" : "Review"} <ChevronDownIcon className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={10} className="bg-forest-50/40 px-4 py-4">
                          <PaperReview attempt={a} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
