"use client";

import Logo from "../Logo";
import { CheckIcon, ClockIcon, CloseIcon, StarIcon } from "../icons";
import { OptionContent, QuizFigure, isFigure } from "./QuizFigure";
import { CLOSE_LABEL, OPEN_LABEL, QUIZ_MINUTES, bankIdsFor, dayLabel, groupById, paperSections, perSectionFor, questionsFor } from "@/data/dailyQuiz";
import { paperTotal, type Answers, type DailyAttempt, type QuizBank } from "@/lib/dailyQuiz";

const letters = ["a", "b", "c", "d"];

export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function InfoCard({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-forest-100 bg-white">
      <p className={`px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-white ${tone}`}>{title}</p>
      <div className="p-4 text-xs leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

function Legend() {
  return (
    <ul className="space-y-1.5">
      <li className="flex items-center gap-2">
        <CheckIcon className="h-3.5 w-3.5 text-emerald-600" /> Correct answer
      </li>
      <li className="flex items-center gap-2">
        <CloseIcon className="h-3.5 w-3.5 text-red-600" /> Wrong answer
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-blue-600" /> Your answer
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-emerald-600" /> Correct option
      </li>
    </ul>
  );
}

/** Instructions, sections, the learner's paper and legend: the four cards above the paper. */
export function PaperGuide({ group, banks }: { group: string; banks?: string[] }) {
  const g = groupById(group);
  const sections = paperSections(group, banks ?? bankIdsFor(group));
  const total = banks ? banks.length * perSectionFor(group) : questionsFor(group);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <InfoCard title="Instructions" tone="bg-forest-800">
        <ul className="space-y-1">
          {[
            "Read all questions carefully",
            "Choose one answer for every question",
            "Each question carries 1 mark",
            "No negative marking",
            `Submit opens once all ${total} are answered`,
            `${QUIZ_MINUTES} minutes; one attempt per day`,
          ].map((t) => (
            <li key={t} className="flex items-start gap-1.5">
              <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-forest-600" /> {t}
            </li>
          ))}
        </ul>
      </InfoCard>
      <InfoCard title="Subject categories" tone="bg-rose-600">
        <ul className="space-y-1">
          {sections.map((s) => (
            <li key={s.bankId} className={`flex items-start gap-2 font-semibold ${s.text}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] text-white ${s.color}`}>{s.letter}</span>
              {s.title}
            </li>
          ))}
        </ul>
      </InfoCard>
      <InfoCard title="Your paper" tone="bg-emerald-600">
        <dl className="space-y-1.5">
          {[
            ["Class / course", g?.label ?? group],
            ["Questions", `${total} (${sections.length} × ${perSectionFor(group)})`],
            ["Marks", `${total}, 1 per question`],
            ["Time", `${QUIZ_MINUTES} minutes`],
            ["Open", `${OPEN_LABEL} – ${CLOSE_LABEL}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-semibold text-forest-950">{v}</dd>
            </div>
          ))}
        </dl>
      </InfoCard>
      <InfoCard title="Legend (result)" tone="bg-violet-600">
        <Legend />
      </InfoCard>
    </div>
  );
}

function Chip({ letter, tone }: { letter: string; tone: "blue" | "green" | "red" | "plain" }) {
  const cls = {
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-600 text-white",
    red: "bg-red-600 text-white",
    plain: "border border-slate-300 text-slate-500",
  }[tone];
  return <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${cls}`}>{letter}</span>;
}

function QuestionRow({
  no,
  text,
  figure,
  options,
  chosen,
  correct,
  review,
  sectionText,
  sectionColor,
  pictures,
  onPick,
}: {
  no: number;
  /** Drawing shown under the question (Navodaya figure questions). */
  figure?: string;
  text: string;
  options: string[];
  chosen: number | null | undefined;
  correct?: number;
  review: boolean;
  sectionText: string;
  sectionColor: string;
  /** Classes 1–3: bigger text so the picture (emoji) questions are easy to see. */
  pictures?: boolean;
  onPick?: (option: number) => void;
}) {
  const answered = chosen !== null && chosen !== undefined;
  const right = review && answered && chosen === correct;
  return (
    <li className="grid gap-3 border-b border-forest-100 px-3 py-4 last:border-0 sm:px-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,2.6fr)_auto] xl:items-center">
      <p className={`flex items-start gap-2.5 font-semibold ${pictures ? "text-lg leading-relaxed sm:text-xl" : "text-sm"} ${sectionText}`}>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white ${sectionColor}`}>{no}</span>
        <span className="pt-0.5">
          {text}
          {figure && <QuizFigure svg={figure} alt={`Figure for question ${no}`} />}
        </span>
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label={`Question ${no}`}>
        {options.map((opt, i) => {
          const isChosen = chosen === i;
          const isCorrect = review && correct === i;
          const isWrong = review && isChosen && correct !== i;
          const tone = isCorrect
            ? "border-emerald-500 bg-emerald-50 text-emerald-900"
            : isWrong
              ? "border-red-400 bg-red-50 text-red-800"
              : isChosen
                ? "border-blue-500 bg-blue-50 text-blue-900"
                : "border-slate-200 bg-white text-slate-700";
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={review || !onPick}
              onClick={() => onPick?.(i)}
              className={`flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${pictures ? "text-base sm:text-lg" : "text-sm"} ${tone} ${
                review ? "cursor-default" : "hover:border-blue-400 hover:bg-blue-50/60"
              }`}
            >
              <Chip letter={letters[i]} tone={isCorrect ? "green" : isWrong ? "red" : isChosen ? "blue" : "plain"} />
              <span className="min-w-0">
                <OptionContent value={opt} />
              </span>
            </button>
          );
        })}
      </div>

      {/* your answer · result · correct answer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 xl:w-56 xl:justify-end">
        <span className="flex items-center gap-1.5">
          <span className="xl:sr-only">Your answer</span>
          {answered ? <Chip letter={letters[chosen!]} tone="blue" /> : <span className="w-6 text-center">—</span>}
        </span>
        {review && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="xl:sr-only">Result</span>
              {right ? (
                <CheckIcon className="h-5 w-5 text-emerald-600" aria-label="Correct" />
              ) : answered ? (
                <CloseIcon className="h-5 w-5 text-red-600" aria-label="Wrong" />
              ) : (
                <span className="text-slate-400">Skipped</span>
              )}
            </span>
            {correct !== undefined && (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="xl:sr-only">Correct</span>
                <Chip letter={letters[correct]} tone="green" />
                <span className="truncate font-semibold text-emerald-700 xl:max-w-[7.5rem]">{isFigure(options[correct]) ? <OptionContent value={options[correct]} small /> : options[correct]}</span>
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/** The full paper: header, guide, the five colour-coded sections, and (after submitting) the marked answers. */
export default function QuizPaper({
  attempt,
  banks,
  answers,
  review,
  timeLeft,
  onPick,
}: {
  attempt: DailyAttempt;
  banks: Record<string, QuizBank>;
  answers: Answers;
  review: boolean;
  timeLeft?: number;
  onPick?: (bank: string, index: number, option: number) => void;
}) {
  const group = groupById(attempt.group);
  const total = paperTotal(attempt);
  const sections = paperSections(attempt.group, Object.keys(attempt.picks));
  let no = 0;
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-forest-100 bg-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Logo />
          <p className="mt-1 text-xs font-semibold text-forest-600">Learn daily. Compete today. Succeed tomorrow.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700">Daily quiz</p>
            <p className="text-xs font-semibold text-rose-900 sm:text-sm">
              {OPEN_LABEL} – {CLOSE_LABEL}
            </p>
          </div>
          <div className={`rounded-2xl border px-3 py-2 text-center ${timeLeft !== undefined && timeLeft <= 60 ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
              <ClockIcon className="h-3.5 w-3.5" /> Time left
            </p>
            <p className={`font-mono text-base font-bold sm:text-lg ${timeLeft !== undefined && timeLeft <= 60 ? "text-red-600" : "text-amber-900"}`} aria-live="off">
              {review ? "Done" : timeLeft === undefined ? "--:--" : clock(timeLeft)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              <StarIcon className="h-3.5 w-3.5" /> Your points
            </p>
            <p className="text-base font-bold text-emerald-900 sm:text-lg">{review && attempt.score !== undefined ? attempt.score : "--"} / {total}</p>
          </div>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 rounded-2xl border border-forest-100 bg-white px-4 py-3 text-xs text-slate-500">
        {[
          ["Quiz ID", attempt.code],
          ["Date", dayLabel(attempt.day)],
          ["Total questions", String(total)],
          ["Total marks", String(total)],
          ["Class / course", group?.label ?? attempt.group],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-1.5">
            <dt>{k}:</dt>
            <dd className="font-semibold text-forest-950">{v}</dd>
          </div>
        ))}
      </dl>

      <PaperGuide group={attempt.group} banks={sections.map((s) => s.bankId)} />

      {/* the sections */}
      <div className="overflow-hidden rounded-3xl border border-forest-100 bg-white">
        <div className="hidden grid-cols-[minmax(0,1.15fr)_minmax(0,2.6fr)_14rem] gap-3 bg-forest-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white xl:grid">
          <span>Question</span>
          <span>Options (choose the correct answer)</span>
          <span className="grid grid-cols-3 text-center">
            <span>Yours</span>
            <span>Result</span>
            <span>Correct</span>
          </span>
        </div>
        {sections.map((sec) => {
            const { bankId, title } = sec;
            const bank = banks[bankId];
            return (
              <section key={bankId} aria-label={`Section ${sec.letter}: ${title}`}>
                <h3 className={`px-4 py-2 text-xs font-bold uppercase tracking-wider text-white ${sec.color}`}>
                  {sec.letter}. {title}
                </h3>
                <ol>
                  {attempt.picks[bankId].map((n, i) => {
                    no++;
                    const q = bank?.questions[n];
                    if (!q) return null;
                    return (
                      <QuestionRow
                        key={`${bankId}-${n}`}
                        no={no}
                        text={q.q}
                        figure={q.f}
                        options={q.o}
                        chosen={answers[bankId]?.[i]}
                        correct={attempt.correct?.[bankId]?.[i]}
                        review={review}
                        sectionText={sec.text}
                        sectionColor={sec.color}
                        pictures={group?.pictures}
                        onPick={onPick ? (opt) => onPick(bankId, i, opt) : undefined}
                      />
                    );
                  })}
                </ol>
              </section>
            );
          })}
      </div>
    </div>
  );
}
