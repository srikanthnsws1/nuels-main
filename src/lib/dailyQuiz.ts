"use client";

import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { bankIdsFor, groupForClass, perSectionFor, quizCode } from "@/data/dailyQuiz";

/**
 * Daily Quiz on stored question banks (no server code needed):
 *  - quizBanks/{bankId}:              questions without answers, readable by any signed-in user
 *  - quizKeys/{bankId}:               the answer key, never readable by learners
 *  - quizPaperKeys/{group}:           every answer key a group's paper uses, in one doc (rules check scores with it)
 *  - quizKeys/{bankId}/items/{n}:     one answer, readable only for a question on the learner's submitted paper
 *  - dailyQuiz/{uid}_{day}:           one paper per learner per India-time day
 * Bank questions are only ever appended, so the indexes stored on old papers stay valid.
 */
/** A question: text, options (text or "<svg …>" drawings) and an optional figure drawing. */
export type QuizQuestion = { q: string; o: string[]; f?: string };
export type QuizBank = { id: string; title?: string; questions: QuizQuestion[] };
export type Answers = Record<string, (number | null)[]>;

export type DailyAttempt = {
  id: string;
  uid: string;
  name: string;
  memberId?: string;
  institution?: string;
  day: number;
  group: string;
  code: string;
  picks: Record<string, number[]>;
  startedAt?: Timestamp;
  answers?: Answers;
  submittedAt?: Timestamp;
  /** Seconds from start to submit. */
  timeTaken?: number;
  correct?: Record<string, number[]>;
  score?: number;
  /** Local copy with writes the server hasn't confirmed yet (e.g. the submit still in flight). */
  pending?: boolean;
};

export const attemptId = (uid: string, day: number) => `${uid}_${day}`;
/** Questions on a paper: 10, 25 or 30 depending on the class. */
export const paperTotal = (a: Pick<DailyAttempt, "picks">) => Object.values(a.picks).reduce((s, p) => s + p.length, 0);

/** The learner's papers, newest first; null while loading. */
export function useMyQuizzes(uid: string | undefined): DailyAttempt[] | null {
  const [rows, setRows] = useState<DailyAttempt[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "dailyQuiz"), where("uid", "==", uid)),
      { includeMetadataChanges: true },
      (snap) =>
        setRows(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }), pending: d.metadata.hasPendingWrites }) as DailyAttempt)
            .sort((a, b) => b.day - a.day),
        ),
      (err) => {
        console.warn("Couldn't load quiz history", err);
        setRows([]);
      },
    );
  }, [uid]);
  return rows;
}

const bankCache = new Map<string, Promise<QuizBank | null>>();
/** One question bank (cached for the session); null if it hasn't been uploaded. */
export function loadBank(id: string) {
  if (!bankCache.has(id)) {
    const job = getDoc(doc(db, "quizBanks", id)).then((s) => (s.exists() ? ({ id, ...s.data() } as QuizBank) : null));
    job.catch(() => bankCache.delete(id));
    bankCache.set(id, job);
  }
  return bankCache.get(id)!;
}

/** Every bank a paper needs (a group's, or the ones on a stored paper), or null if any is missing. */
export async function loadBanks(group: string, ids = bankIdsFor(group)): Promise<Record<string, QuizBank> | null> {
  const banks = await Promise.all(ids.map(loadBank));
  if (!ids.length || banks.some((b) => !b || b.questions.length < perSectionFor(group))) return null;
  return Object.fromEntries(banks.map((b) => [b!.id, b!]));
}

/** Small seeded random generator, so a paper is reproducible from (learner, day). */
function seeded(text: string) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Five questions per bank: never-seen questions first, then the ones seen longest ago,
 * shuffled by a seed unique to this learner and day. So no two learners share a paper and
 * a learner doesn't see a question again until they've been through the whole bank.
 */
export function choosePicks(uid: string, day: number, group: string, banks: Record<string, QuizBank>, history: DailyAttempt[]) {
  const rand = seeded(`${uid}:${day}`);
  const picks: Record<string, number[]> = {};
  for (const [id, bank] of Object.entries(banks)) {
    const lastSeen = new Map<number, number>();
    for (const a of history) for (const n of a.picks[id] ?? []) lastSeen.set(n, Math.max(lastSeen.get(n) ?? -1, a.day));
    picks[id] = bank.questions
      .map((_, n) => ({ n, seen: lastSeen.get(n) ?? -1, r: rand() }))
      .sort((a, b) => a.seen - b.seen || a.r - b.r)
      .slice(0, perSectionFor(group))
      .map((x) => x.n)
      .sort((a, b) => a - b);
  }
  return picks;
}

type Learner = { uid: string; name: string; memberId?: string; institution?: string };

/** Starts today's paper; the server clock stamps the start, so the 15 minutes run from here. */
export async function startQuiz(user: Learner, group: string, day: number, banks: Record<string, QuizBank>, history: DailyAttempt[]) {
  const id = attemptId(user.uid, day);
  await setDoc(doc(db, "dailyQuiz", id), {
    uid: user.uid,
    name: user.name,
    ...(user.memberId ? { memberId: user.memberId } : {}),
    ...(user.institution ? { institution: user.institution } : {}),
    day,
    group,
    code: quizCode(day, user.memberId, user.uid),
    picks: choosePicks(user.uid, day, group, banks, history),
    startedAt: serverTimestamp(),
  });
  return id;
}

export function submitQuiz(attempt: DailyAttempt, answers: Answers, timeTaken: number) {
  const clean: Answers = Object.fromEntries(
    Object.entries(attempt.picks).map(([b, p]) => [b, p.map((_, i) => answers[b]?.[i] ?? null)]),
  );
  return updateDoc(doc(db, "dailyQuiz", attempt.id), { answers: clean, submittedAt: serverTimestamp(), timeTaken: Math.max(0, Math.round(timeTaken)) });
}

/**
 * After submitting: fetch the answers for this paper's questions (the rules only release them now),
 * then save them with the score; the rules check both against the hidden answer key.
 */
export async function scoreQuiz(attempt: DailyAttempt) {
  const correct: Record<string, number[]> = {};
  await Promise.all(
    Object.entries(attempt.picks).map(async ([bank, picks]) => {
      correct[bank] = await Promise.all(
        picks.map(async (n) => {
          const snap = await getDoc(doc(db, "quizKeys", bank, "items", String(n)));
          return snap.data()?.a as number;
        }),
      );
    }),
  );
  const score = Object.keys(correct).reduce((s, b) => s + correct[b].filter((c, i) => attempt.answers?.[b]?.[i] === c).length, 0);
  // Two writes, each checked by the rules: the correct options first (skipped if a previous try saved them), then the score.
  if (!attempt.correct) await updateDoc(doc(db, "dailyQuiz", attempt.id), { correct });
  await updateDoc(doc(db, "dailyQuiz", attempt.id), { score });
  return { correct, score };
}

/** Learners who registered before classes were asked choose theirs once; after that only an admin can change it. */
export function setStudyClass(uid: string, studyClass: string) {
  const quizGroup = groupForClass(studyClass);
  if (!quizGroup) throw new Error(`Unknown class ${studyClass}`);
  return updateDoc(doc(db, "users", uid), { studyClass, quizGroup });
}

/** "Correct", "wrong" and "skipped" counts for a scored paper. */
export function tally(a: DailyAttempt) {
  let correct = 0;
  let wrong = 0;
  let attempted = 0;
  for (const b of Object.keys(a.picks)) {
    a.picks[b].forEach((_, i) => {
      const ans = a.answers?.[b]?.[i];
      if (ans === null || ans === undefined) return;
      attempted++;
      if (a.correct && ans === a.correct[b][i]) correct++;
      else if (a.correct) wrong++;
    });
  }
  const total = paperTotal(a);
  return { attempted, correct, wrong, total, score: a.score ?? correct, pct: total ? Math.round(((a.score ?? correct) / total) * 100) : 0 };
}

/** Score per section bank, e.g. { "ALL-A": 4, "C-E": 3, ... }. */
export function sectionScores(a: DailyAttempt) {
  return Object.fromEntries(
    Object.keys(a.picks).map((b) => [b, a.correct?.[b] ? a.correct[b].filter((c, i) => a.answers?.[b]?.[i] === c).length : 0]),
  ) as Record<string, number>;
}

export const formatDuration = (s?: number) => (s === undefined ? "—" : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);

// ---- admin ----

/** Every paper between two quiz days (inclusive); null while loading. */
export function useQuizAttempts(fromDay: number, toDay: number): { rows: DailyAttempt[] | null; error: string } {
  const [state, setState] = useState<{ key: string; rows: DailyAttempt[] | null; error: string }>({ key: "", rows: null, error: "" });
  const key = `${fromDay}-${toDay}`;
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "dailyQuiz"), where("day", ">=", fromDay), where("day", "<=", toDay)),
        (snap) => setState({ key, rows: snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }) as DailyAttempt), error: "" }),
        () => setState({ key, rows: [], error: "Couldn't load quiz results. Make sure the Firestore rules are deployed." }),
      ),
    [fromDay, toDay, key],
  );
  return state.key === key ? state : { rows: null, error: "" };
}

export type QuizReward = { month: string; uid: string; name: string; memberId?: string; points: number; quizzes: number; avgPct: number; note?: string; rewardedAt?: Timestamp };

export function useQuizRewards(): QuizReward[] | null {
  const [rows, setRows] = useState<QuizReward[] | null>(null);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "quizRewards"),
        (snap) => setRows(snap.docs.map((d) => ({ month: d.id, ...d.data() }) as QuizReward).sort((a, b) => b.month.localeCompare(a.month))),
        () => setRows([]),
      ),
    [],
  );
  return rows;
}

/** Admin: records the month's best performer as rewarded. */
export function saveReward(reward: Omit<QuizReward, "rewardedAt">, adminUid: string) {
  const { month, ...rest } = reward;
  return setDoc(doc(db, "quizRewards", month), { ...rest, rewardedBy: adminUid, rewardedAt: serverTimestamp() });
}
