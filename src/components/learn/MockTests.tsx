"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardTitle, EmptyState, ProgressBar } from "../dashboard/ui";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClockIcon, CloseIcon, LockIcon } from "../icons";
import type { Module } from "@/data/learning";
import type { CourseProgress } from "@/lib/learning";
import {
  MOCK_TEST_MINUTES,
  mockTestError,
  startMockTest,
  submitMockTest,
  useMyMockTests,
  useQuestionBanks,
  type MockTestInProgress,
  type MockTestResult,
  type QuestionBank,
} from "@/lib/mockTests";

const LETTERS = ["A", "B", "C", "D"];

/** Answers survive a refresh while the test is running. */
const draftKey = (slug: string, lessonId: string) => `mocktest:${slug}:${lessonId}`;
function loadDraft(slug: string, lessonId: string, n: number): (number | null)[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey(slug, lessonId)) ?? "null");
    if (Array.isArray(saved) && saved.length === n) return saved;
  } catch {}
  return Array(n).fill(null);
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** One timed attempt: a question per screen, A–D options, auto-submit when time runs out. */
function TestRunner({
  uid,
  bank,
  test,
  onFinished,
}: {
  uid: string;
  bank: QuestionBank;
  test: MockTestInProgress;
  onFinished: (r: MockTestResult) => void;
}) {
  const { slug, lessonId } = bank;
  const n = test.questions.length;
  const [answers, setAnswers] = useState<(number | null)[]>(() => loadDraft(slug, lessonId, n));
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Count down on the server's clock, whatever the device's clock says.
  const [skew] = useState(() => test.serverNow - Date.now());
  const [remaining, setRemaining] = useState(() => test.deadline - (Date.now() + skew));
  const answersRef = useRef(answers);
  const sent = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
    try {
      sessionStorage.setItem(draftKey(slug, lessonId), JSON.stringify(answers));
    } catch {}
  }, [answers, slug, lessonId]);

  const send = useCallback(async () => {
    if (sent.current) return;
    sent.current = true;
    setSubmitting(true);
    setError("");
    try {
      const r = await submitMockTest(uid, bank, answersRef.current);
      try {
        sessionStorage.removeItem(draftKey(slug, lessonId));
      } catch {}
      onFinished(r);
    } catch (err) {
      sent.current = false;
      setSubmitting(false);
      setError(mockTestError(err));
    }
  }, [uid, bank, slug, lessonId, onFinished]);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = test.deadline - (Date.now() + skew);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        send();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [test.deadline, skew, send]);

  // Warn before closing the tab mid-test.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const answered = answers.filter((a) => a !== null).length;
  const q = test.questions[index];
  const lowTime = remaining <= 60_000;

  const submitNow = () => {
    const unanswered = n - answered;
    if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway? You can't retake this test.`)) return;
    send();
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-600">Mock test</p>
          <h2 className="text-lg font-bold text-forest-950">{test.lessonTitle}</h2>
        </div>
        <div
          role="timer"
          aria-live="off"
          className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 font-mono text-lg font-bold ${
            lowTime ? "animate-pulse bg-red-50 text-red-600" : "bg-forest-50 text-forest-800"
          }`}
        >
          <ClockIcon className="h-5 w-5" /> {formatTime(remaining)}
        </div>
      </div>

      {/* question navigator */}
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Questions">
        {test.questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-current={i === index ? "step" : undefined}
            aria-label={`Question ${i + 1}${answers[i] !== null ? ", answered" : ""}`}
            className={`h-9 w-9 rounded-full text-sm font-bold transition ${
              i === index
                ? "bg-forest-700 text-white"
                : answers[i] !== null
                  ? "bg-spark-500/30 text-forest-900"
                  : "border border-forest-200 text-slate-500 hover:bg-forest-50"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-forest-100 p-4 sm:p-6">
        <p className="text-sm font-semibold text-slate-500">
          Question {index + 1} of {n}
        </p>
        <p className="mt-2 whitespace-pre-line text-base font-semibold leading-relaxed text-forest-950 sm:text-lg">{q.question}</p>
        <div className="mt-5 grid gap-3" role="radiogroup" aria-label={`Options for question ${index + 1}`}>
          {q.options.map((opt, i) => {
            const chosen = answers[index] === i;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={submitting}
                onClick={() => setAnswers((a) => a.map((v, j) => (j === index ? i : v)))}
                className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition sm:text-base ${
                  chosen ? "border-forest-700 bg-forest-50 ring-2 ring-forest-700/15" : "border-forest-100 hover:border-forest-300 hover:bg-forest-50/50"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    chosen ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-700"
                  }`}
                >
                  {LETTERS[i]}
                </span>
                <span className="pt-0.5 text-forest-950">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex items-center gap-2 rounded-full border border-forest-200 px-5 py-2.5 text-sm font-semibold text-forest-700 transition hover:bg-forest-50 disabled:opacity-40"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Previous
        </button>
        <span className="text-sm text-slate-500">
          {answered}/{n} answered
        </span>
        {index < n - 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(n - 1, i + 1))}
            className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-600"
          >
            Next <ArrowRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submitNow}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-spark-500 px-6 py-2.5 text-sm font-bold text-forest-900 transition hover:bg-spark-400 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit test"}
          </button>
        )}
      </div>
    </Card>
  );
}

/** Score plus every question with the learner's answer, the correct one and why. */
function TestReview({ result, onBack }: { result: MockTestResult; onBack: () => void }) {
  const pct = Math.round((result.score / result.total) * 100);
  return (
    <Card>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-500">
        <ArrowLeftIcon className="h-4 w-4" /> All mock tests
      </button>
      <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-forest-700 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-spark-400">Mock test result</p>
          <h2 className="mt-1 text-xl font-bold text-white">{result.lessonTitle}</h2>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-4xl font-bold text-white">
            {result.score}
            <span className="text-xl text-forest-200">/{result.total}</span>
          </p>
          <p className="text-sm text-forest-100">{pct}% · {pct >= 80 ? "Excellent!" : pct >= 50 ? "Good effort. Review the misses below." : "Revisit this lesson and review the answers below."}</p>
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        {result.questions.map((q, i) => {
          const picked = result.answers[i];
          const right = picked === q.answer;
          return (
            <li key={i} className={`rounded-2xl border p-4 sm:p-5 ${right ? "border-forest-200" : "border-red-200"}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${right ? "bg-forest-600 text-white" : "bg-red-100 text-red-600"}`}>
                  {right ? <CheckIcon className="h-4 w-4" /> : <CloseIcon className="h-4 w-4" />}
                </span>
                <p className="whitespace-pre-line font-semibold text-forest-950">
                  {i + 1}. {q.question}
                </p>
              </div>
              <ul className="mt-3 space-y-2 pl-10 text-sm">
                {q.options.map((opt, j) => {
                  const isAnswer = j === q.answer;
                  const isPicked = j === picked;
                  return (
                    <li
                      key={j}
                      className={`rounded-xl px-3 py-2 ${
                        isAnswer ? "bg-forest-50 font-semibold text-forest-800" : isPicked ? "bg-red-50 text-red-700 line-through" : "text-slate-600"
                      }`}
                    >
                      {LETTERS[j]}. {opt}
                      {isAnswer && <span className="ml-2 text-xs font-bold text-forest-600">Correct answer</span>}
                      {isPicked && !isAnswer && <span className="ml-2 text-xs font-bold no-underline">Your answer</span>}
                    </li>
                  );
                })}
                {picked === null && <li className="px-3 text-xs font-semibold text-amber-600">Not answered</li>}
              </ul>
              {q.explanation && <p className="mt-3 pl-10 text-sm leading-relaxed text-slate-600">{q.explanation}</p>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

type View =
  | { kind: "list" }
  | { kind: "loading"; lessonId: string }
  | { kind: "running"; lessonId: string; test: MockTestInProgress }
  | { kind: "review"; lessonId: string; result: MockTestResult };

/** One AI mock test per lesson; each unlocks when its lesson is marked done and can be taken once. */
export default function MockTests({ uid, slug, modules, progress }: { uid: string; slug: string; modules: Module[]; progress: CourseProgress }) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [error, setError] = useState("");
  const banks = useQuestionBanks(slug);
  const attempts = useMyMockTests(uid, slug);
  const lessons = modules.flatMap((m) => m.lessons);
  const withTests = lessons.filter((l) => banks?.[l.id]);
  const done = withTests.filter((l) => attempts?.[l.id]?.submittedAt);
  const totals = done.reduce((s, l) => ({ score: s.score + (attempts?.[l.id]?.score ?? 0), total: s.total + (attempts?.[l.id]?.total ?? 10) }), { score: 0, total: 0 });
  const average = totals.total ? Math.round((totals.score / totals.total) * 100) : null;

  const open = async (lessonId: string, fresh: boolean) => {
    const bank = banks?.[lessonId];
    if (!bank) return;
    if (fresh && !window.confirm(`You'll have ${MOCK_TEST_MINUTES} minutes for 10 questions, and you can take this test only once. Start now?`)) return;
    setError("");
    setView({ kind: "loading", lessonId });
    try {
      const state = await startMockTest(uid, bank);
      setView(state.status === "submitted" ? { kind: "review", lessonId, result: state } : { kind: "running", lessonId, test: state });
    } catch (err) {
      setError(mockTestError(err));
      setView({ kind: "list" });
    }
  };

  const finished = useCallback((lessonId: string) => (r: MockTestResult) => setView({ kind: "review", lessonId, result: r }), []);

  if (view.kind === "running" && banks?.[view.lessonId])
    return <TestRunner uid={uid} bank={banks[view.lessonId]} test={view.test} onFinished={finished(view.lessonId)} />;
  if (view.kind === "review") return <TestReview result={view.result} onBack={() => setView({ kind: "list" })} />;

  return (
    <Card id="mock-tests">
      <CardTitle
        title="Mock tests"
        action={
          <span className="text-sm text-slate-500">
            {done.length}/{withTests.length} taken{average !== null && <> · average {average}%</>}
          </span>
        }
      />
      <p className="mt-1 text-sm text-slate-600">
        Each test has 10 multiple-choice questions and a {MOCK_TEST_MINUTES}-minute time limit. It unlocks when you finish its lesson, and you
        can take it once.
      </p>
      {lessons.length > 0 && (
        <div className="mt-4">
          <ProgressBar value={withTests.length ? Math.round((done.length / withTests.length) * 100) : 0} />
        </div>
      )}
      {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {banks === null || attempts === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading tests…</p>
      ) : lessons.length === 0 ? (
        <EmptyState icon={ClockIcon} title="No lessons yet">
          Tests appear here once the course has lessons.
        </EmptyState>
      ) : (
        <div className="mt-6 space-y-6">
          {modules.map((m, mi) => (
            <div key={m.title}>
              <p className="text-sm font-bold text-forest-950">
                {mi + 1}. {m.title}
              </p>
              <ul className="mt-2 divide-y divide-forest-100 rounded-2xl border border-forest-100">
                {m.lessons.map((l) => {
                  const number = lessons.indexOf(l) + 1;
                  const attempt = attempts[l.id];
                  const record = attempt?.submittedAt ? { score: attempt.score ?? 0, total: attempt.total ?? 10 } : null;
                  const inProgress = !!attempt && !attempt.submittedAt;
                  const hasTest = !!banks[l.id];
                  const unlocked = progress.completed.includes(l.id);
                  const loading = view.kind === "loading" && view.lessonId === l.id;
                  return (
                    <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-sm font-bold text-forest-700">{number}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-forest-950">Test {number}: {l.title}</span>
                        <span className="block text-xs text-slate-500">
                          {record
                            ? `Score ${record.score}/${record.total}`
                            : !hasTest
                              ? "Test coming soon"
                              : inProgress
                                ? "In progress: the timer is running"
                                : unlocked
                                  ? `10 questions · ${MOCK_TEST_MINUTES} minutes · 1 attempt`
                                  : "Finish this lesson to unlock"}
                        </span>
                      </span>
                      {record ? (
                        <button
                          type="button"
                          onClick={() => open(l.id, false)}
                          disabled={view.kind === "loading"}
                          className="inline-flex items-center gap-2 rounded-full border border-forest-200 px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50 disabled:opacity-50"
                        >
                          <span className="rounded-full bg-spark-500/30 px-2 py-0.5 text-xs font-bold text-forest-900">
                            {record.score}/{record.total}
                          </span>
                          Review
                        </button>
                      ) : !hasTest ? (
                        <span className="text-xs font-semibold text-slate-400">Coming soon</span>
                      ) : inProgress || unlocked ? (
                        <button
                          type="button"
                          onClick={() => open(l.id, !inProgress)}
                          disabled={view.kind === "loading"}
                          className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-600 disabled:opacity-50"
                        >
                          {loading ? "Opening…" : inProgress ? "Resume test" : "Start test"}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <LockIcon className="h-3.5 w-3.5" /> Locked
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
