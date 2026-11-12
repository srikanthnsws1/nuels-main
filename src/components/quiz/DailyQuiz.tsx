"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon, CheckIcon, ClockIcon, GraduationIcon, LockIcon } from "../icons";
import { Card, EmptyState } from "../dashboard/ui";
import QuizHistory from "./QuizHistory";
import QuizPaper, { PaperGuide } from "./QuizPaper";
import {
  CLOSE_LABEL,
  CLOSE_MINUTE,
  OPEN_LABEL,
  OPEN_MINUTE,
  QUIZ_LANDING_KEY,
  QUIZ_MINUTES,
  bankTitle,
  groupById,
  istDay,
  istMinute,
  questionsFor,
  quizOpenAt,
  studyClassById,
  studyClassGroups,
} from "@/data/dailyQuiz";
import type { AppUser } from "@/lib/auth";
import {
  loadBanks,
  paperTotal,
  scoreQuiz,
  setStudyClass,
  startQuiz,
  submitQuiz,
  tally,
  useMyQuizzes,
  type Answers,
  type DailyAttempt,
  type QuizBank,
} from "@/lib/dailyQuiz";

const GRACE_MS = 5_000;
/** Expired papers already handed in during this session (so it happens once). */
const wasOpenHere = new Set<string>();

/** Ticks every second while `active`, otherwise once a minute (enough to notice the window opening). */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), active ? 1000 : 30_000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

const draftKey = (id: string) => `nsq:${id}`;
function readDraft(id: string): Answers {
  try {
    return JSON.parse(localStorage.getItem(draftKey(id)) ?? "{}") as Answers;
  } catch {
    return {};
  }
}
function saveDraft(id: string, a: Answers) {
  try {
    localStorage.setItem(draftKey(id), JSON.stringify(a));
  } catch {
    /* private mode: answers just aren't kept across reloads */
  }
}

const goDashboard = () => {
  window.location.hash = "overview";
};

/**
 * Set at login and registration: the learner lands on the quiz only when there's one to take.
 * If today's is already done, or it's outside 5 AM – 7 PM, they go to the overview instead.
 */
function takeLandingFlag() {
  try {
    const set = sessionStorage.getItem(QUIZ_LANDING_KEY) === "1";
    sessionStorage.removeItem(QUIZ_LANDING_KEY);
    return set;
  } catch {
    return false;
  }
}

function Spinner({ label }: { label: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-14 text-sm text-slate-500">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" aria-hidden />
        {label}
      </div>
    </Card>
  );
}

/** Learners who registered before the class was asked choose it once; it sets their quiz pattern. */
function ClassPicker({ user }: { user: AppUser }) {
  const [choice, setChoice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const picked = studyClassById(choice);
  const group = picked ? groupById(picked.group) : undefined;
  const save = async () => {
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      await setStudyClass(user.uid, picked.id);
    } catch (err) {
      console.error("Could not save class", err);
      setError("Couldn't save your class. Please check your connection and try again.");
      setSaving(false);
    }
  };
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wider text-forest-600">Daily quiz · one-time setup</p>
      <h2 className="mt-1 text-xl font-bold text-forest-950 sm:text-2xl">Which class or course are you in?</h2>
      <p className="mt-1 text-sm text-slate-600">Your daily questions are set for your class. Choose it once and your quiz starts right after.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="mb-1.5 block text-sm font-medium text-forest-900">Class / Standard / Course</span>
          <select
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            disabled={saving}
            className="w-full rounded-2xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-forest-300"
          >
            <option value="">Select your class or course</option>
            {studyClassGroups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={!picked || saving}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save and start"} {!saving && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </div>
      {group && (
        <p className="mt-4 rounded-2xl bg-forest-50 px-4 py-3 text-sm text-forest-900">
          Your paper: <strong>{questionsFor(group.id)} questions</strong> on {group.banks.map(bankTitle).join(", ")}, in {QUIZ_MINUTES} minutes.
          Only an admin can change your class later.
        </p>
      )}
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
    </Card>
  );
}

/** Shown when the learner opens the quiz again after taking today's. */
function AlreadyTaken({ attempt, onReview }: { attempt: DailyAttempt; onReview: () => void }) {
  const t = tally(attempt);
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-xl shadow-forest-900/5">
      <div className="relative aspect-[16/9]">
        <Image src="/images/hero.webp" alt="" fill sizes="448px" className="object-cover object-top" />
      </div>
      <div className="p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-600 text-emerald-600">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-xl font-bold text-forest-950">You&apos;ve already taken today&apos;s quiz</h2>
        {attempt.score !== undefined && (
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {attempt.score} / {t.total} <span className="text-base text-slate-500">({t.pct}%)</span>
          </p>
        )}
        <p className="mt-2 text-sm text-slate-600">
          Only one attempt is allowed per day. Come back tomorrow from {OPEN_LABEL} for a new quiz.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onReview} className="rounded-full border-2 border-forest-700 py-2.5 text-sm font-semibold text-forest-700 hover:bg-forest-50">
            Review answers
          </button>
          <button type="button" onClick={goDashboard} className="inline-flex items-center justify-center gap-2 rounded-full bg-forest-700 py-2.5 text-sm font-semibold text-white hover:bg-forest-600">
            Dashboard <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Closed({ now }: { now: number }) {
  const m = istMinute(now);
  const early = m < OPEN_MINUTE;
  return (
    <Card>
      <EmptyState icon={LockIcon} title={early ? `Today's quiz opens at ${OPEN_LABEL}` : `Today's quiz closed at ${CLOSE_LABEL}`}>
        The daily quiz is open from {OPEN_LABEL} to {CLOSE_LABEL} (India time).{" "}
        {early ? "Come back soon. Your paper will be waiting." : "Come back tomorrow from 5:00 AM for a fresh paper."}
      </EmptyState>
    </Card>
  );
}

/** "Quiz Submitted!" card with the summary, then View result or Go to dashboard. */
function ResultCard({ attempt, onView }: { attempt: DailyAttempt; onView: () => void }) {
  const t = tally(attempt);
  const rows: [string, string | number][] = [
    ["Total questions", t.total],
    ["Attempted", t.attempted],
    ["Correct answers", t.correct],
    ["Wrong answers", t.wrong],
    ["Score", `${t.score} / ${t.total}`],
    ["Percentage", `${t.pct}%`],
  ];
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="quiz-done">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
          <CheckIcon className="h-8 w-8" />
        </span>
        <h2 id="quiz-done" className="mt-4 text-2xl font-bold text-forest-950">
          Quiz submitted!
        </h2>
        <p className="font-semibold text-forest-800">{t.pct >= 80 ? "Excellent work!" : t.pct >= 60 ? "Great job!" : "Well done for finishing!"}</p>
        <p className="mt-1 text-sm text-slate-500">Your answers have been submitted successfully.</p>
        <dl className="mt-5 space-y-2 rounded-2xl border border-forest-100 bg-forest-50/50 p-4 text-left text-sm">
          <p className="font-bold text-forest-900">Quiz summary</p>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-slate-600">{k}</dt>
              <dd className="font-bold text-forest-950">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ClockIcon className="h-3.5 w-3.5" /> Quiz ID {attempt.code}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onView} className="rounded-2xl border-2 border-forest-700 py-3 text-sm font-semibold text-forest-700 hover:bg-forest-50">
            View result
          </button>
          <button type="button" onClick={goDashboard} className="rounded-2xl bg-forest-700 py-3 text-sm font-semibold text-white hover:bg-forest-600">
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/** The quiz being answered: timer, answers kept on this device, submit once every question is answered. */
function LivePaper({ attempt, banks }: { attempt: DailyAttempt; banks: Record<string, QuizBank> }) {
  const [answers, setAnswers] = useState<Answers>(() => readDraft(attempt.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sent = useRef(false);
  const now = useNow(true);
  const started = attempt.startedAt?.toMillis() ?? now;
  const deadline = started + QUIZ_MINUTES * 60_000;
  const timeLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const total = paperTotal(attempt);
  const answered = Object.values(answers).reduce((s, list) => s + list.filter((x) => x !== null && x !== undefined).length, 0);

  const pick = (bank: string, i: number, option: number) =>
    setAnswers((a) => {
      const next = { ...a, [bank]: [...(a[bank] ?? Array(attempt.picks[bank].length).fill(null))] };
      next[bank][i] = option;
      saveDraft(attempt.id, next);
      return next;
    });

  const send = useCallback(
    async (auto: boolean) => {
      if (sent.current) return;
      sent.current = true;
      setBusy(true);
      setError("");
      try {
        await submitQuiz(attempt, answers, (Math.min(Date.now(), deadline) - started) / 1000);
      } catch (err) {
        console.error("Could not submit quiz", err);
        sent.current = false;
        setBusy(false);
        setError(auto ? "Time's up, but we couldn't send your answers. Check your connection and press Submit." : "Couldn't submit. Please check your connection and try again.");
      }
    },
    [attempt, answers, deadline, started],
  );

  // Time's up: hand in whatever has been answered.
  useEffect(() => {
    if (timeLeft === 0 && attempt.startedAt) send(true);
  }, [timeLeft, attempt.startedAt, send]);

  return (
    <div className="space-y-4 pb-24">
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
        Your {QUIZ_MINUTES}-minute timer has started. Answer all {total} questions, then submit. Unanswered questions are handed in automatically when time runs out.
      </p>
      <QuizPaper attempt={attempt} banks={banks} answers={answers} review={false} timeLeft={timeLeft} onPick={busy ? undefined : pick} />

      {/* sticky submit bar */}
      <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-forest-100 bg-white/95 p-3 shadow-xl shadow-forest-900/10 backdrop-blur sm:p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-forest-950">
            Answered {answered} of {total}
          </p>
          <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-forest-100 sm:w-56">
            <div className="h-full rounded-full bg-spark-500 transition-all" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
          {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-lg font-bold ${timeLeft <= 60 ? "text-red-600" : "text-forest-900"}`}>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => send(false)}
            disabled={busy || answered < total}
            title={answered < total ? `Answer all ${total} questions to submit` : undefined}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {busy ? "Submitting…" : "Submit quiz"} {!busy && <ArrowRightIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Dashboard page: today's paper (start, answer, result) and the learner's quiz history. */
export default function DailyQuiz({ user }: { user: AppUser }) {
  const history = useMyQuizzes(user.uid);
  const now = useNow(false);
  const day = istDay(now);
  const today = history?.find((a) => a.day === day);
  // A class chosen at registration (or once here) sets the group; older accounts choose a class first.
  const group = user.studyClass && groupById(user.quizGroup) && !groupById(user.quizGroup)?.legacy ? user.quizGroup : undefined;
  const [banks, setBanks] = useState<Record<string, QuizBank> | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const starting = useRef(false);
  const scoring = useRef<string | null>(null);
  const wasOpen = useRef(false);

  const paperGroup = today?.group ?? group;
  const paperBanks = today ? Object.keys(today.picks).sort().join(",") : "";
  useEffect(() => {
    if (!paperGroup) return;
    let live = true;
    loadBanks(paperGroup, paperBanks ? paperBanks.split(",") : undefined).then(
      (b) => live && setBanks(b),
      () => live && setBanks(null),
    );
    return () => {
      live = false;
    };
  }, [paperGroup, paperBanks]);

  // Remember whether the paper was being answered in this visit, to show the result card after submitting.
  if (today && !today.submittedAt) wasOpen.current = true;

  const open = quizOpenAt(now);

  // Just logged in or registered: stay for a quiz to take, otherwise go to the overview.
  const landing = useRef<boolean | null>(null);
  useEffect(() => {
    if (landing.current === null) landing.current = takeLandingFlag();
    if (!landing.current || history === null) return;
    const nothingToTake = !!today?.submittedAt || (!today && (!open || banks === null));
    if (nothingToTake) goDashboard();
    if (nothingToTake || today || !group) landing.current = false;
  }, [history, today, open, banks, group]);

  // Open time, class chosen, no paper yet: start it straight away (the timer starts now).
  useEffect(() => {
    if (!history || today || !group || !banks || !open || starting.current) return;
    starting.current = true;
    startQuiz(user, group, day, banks, history).catch((err) => {
      console.error("Could not start quiz", err);
      setError("Couldn't start today's quiz. Please refresh the page to try again.");
    });
  }, [history, today, group, banks, open, day, user]);

  // A paper left open past its time (closed tab): hand it in as it stands.
  useEffect(() => {
    if (!today || today.submittedAt || !today.startedAt) return;
    if (Date.now() > today.startedAt.toMillis() + QUIZ_MINUTES * 60_000 + GRACE_MS && !wasOpenHere.has(today.id)) {
      wasOpenHere.add(today.id);
      submitQuiz(today, readDraft(today.id), QUIZ_MINUTES * 60).catch((err) => console.error("Could not hand in expired quiz", err));
    }
  }, [today]);

  // Submitted: fetch the answers for this paper and save the checked score.
  useEffect(() => {
    // Wait for the server to confirm the hand-in: the answers are only released after that.
    if (!today?.submittedAt || today.pending || today.score !== undefined || scoring.current === today.id) return;
    scoring.current = today.id;
    scoreQuiz(today)
      .then(() => {
        setError("");
        try {
          localStorage.removeItem(draftKey(today.id));
        } catch {
          /* ignore */
        }
        if (wasOpen.current) setShowResult(true);
      })
      .catch((err) => {
        console.error("Could not score quiz", err);
        scoring.current = null;
        setError("Your answers were submitted, but we couldn't load your result. Refresh the page to try again.");
      });
  }, [today]);

  let main: React.ReactNode;
  if (history === null || (paperGroup && banks === undefined)) main = <Spinner label="Loading your daily quiz…" />;
  else if (!today && !group) main = <ClassPicker user={user} />;
  else if (today?.submittedAt && today.score === undefined) main = <Spinner label={error || "Checking your answers…"} />;
  else if (today?.submittedAt) {
    main =
      reviewing || showResult ? (
        banks ? (
          <QuizPaper attempt={today} banks={banks} answers={today.answers ?? {}} review />
        ) : (
          <Spinner label="Loading questions…" />
        )
      ) : (
        <AlreadyTaken attempt={today} onReview={() => setReviewing(true)} />
      );
  } else if (today && banks) main = <LivePaper key={today.id} attempt={today} banks={banks} />;
  else if (!open) main = <Closed now={now} />;
  else if (banks === null)
    main = (
      <Card>
        <EmptyState icon={GraduationIcon} title="Today's quiz is being prepared">
          The questions for your class aren&apos;t ready yet. Please check back a little later.
        </EmptyState>
      </Card>
    );
  else main = <Spinner label={error || "Starting today's quiz…"} />;

  const live = today && !today.submittedAt;
  return (
    <div id="daily-quiz" className="space-y-6">
      {error && !live && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {main}
      {showResult && today?.score !== undefined && <ResultCard
          attempt={today}
          onView={() => {
            setShowResult(false);
            setReviewing(true);
            window.scrollTo({ top: 0 });
          }}
        />}
      {!today && group && !open && <PaperGuide group={group} />}
      {!live && history && history.some((a) => a.submittedAt) && <QuizHistory attempts={history.filter((a) => a.submittedAt)} />}
    </div>
  );
}

/** Overview banner: today's quiz status with a button to it. */
export function QuizBanner({ user }: { user: AppUser }) {
  const history = useMyQuizzes(user.uid);
  const questions = user.studyClass && user.quizGroup ? questionsFor(user.quizGroup) : 0;
  const now = useNow(false);
  const today = history?.find((a) => a.day === istDay(now));
  const open = quizOpenAt(now);
  const done = !!today?.submittedAt;
  const minute = istMinute(now);
  const status = done
    ? `Done for today${today?.score !== undefined ? `: ${today.score}/${paperTotal(today)}` : ""}. Next quiz tomorrow at ${OPEN_LABEL}.`
    : open
      ? today
        ? "Your paper is in progress. Finish before the timer runs out."
        : `${questions ? `${questions} questions` : "Questions for your class"} in ${QUIZ_MINUTES} minutes. Open until ${CLOSE_LABEL}.`
      : minute < OPEN_MINUTE
        ? `Opens at ${OPEN_LABEL} today.`
        : minute >= CLOSE_MINUTE
          ? `Closed for today. Opens tomorrow at ${OPEN_LABEL}.`
          : "";
  return (
    <a
      href="#daily-quiz"
      className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-r from-forest-800 to-forest-700 p-5 text-white transition hover:from-forest-700 hover:to-forest-600 sm:p-6"
    >
      <span className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-spark-400">
          <span className={`h-1.5 w-1.5 rounded-full ${open && !done ? "animate-pulse bg-spark-400" : "bg-white/50"}`} />
          {done ? "Today's quiz completed" : open ? "Today's quiz is live" : "Daily quiz"}
        </span>
        <span className="mt-2 block text-lg font-bold sm:text-xl">{done ? "Great work today!" : questions ? `Ready for today's ${questions} questions?` : "Ready for today's quiz?"}</span>
        <span className="mt-1 block text-sm text-forest-100">{status}</span>
      </span>
      <span className="inline-flex items-center gap-2 rounded-full bg-spark-500 px-5 py-2.5 text-sm font-bold text-forest-900">
        {done ? "View results" : today ? "Continue quiz" : "Start today's quiz"} <ArrowRightIcon className="h-4 w-4" />
      </span>
    </a>
  );
}
