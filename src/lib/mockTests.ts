"use client";

import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

/**
 * Mock tests from a stored question bank (no server code needed):
 *  - questionBanks/{slug}_{lessonId}: 10 questions with 4 options each (no answers)
 *  - answerKeys/{slug}_{lessonId}:    correct option per question + explanations, readable after submitting
 *  - mockTests/{uid}_{slug}_{lessonId}: the learner's single attempt
 * firestore.rules enforce one attempt, the server-clock start, the 10-minute limit and the score.
 */
export const MOCK_TEST_MINUTES = 10;
export const MOCK_TEST_QUESTIONS = 10;
const GRACE_MS = 45_000;

export type MockQuestion = { question: string; options: string[] };
export type ReviewedQuestion = MockQuestion & { answer: number; explanation: string };
export type QuestionBank = { id: string; slug: string; lessonId: string; lessonTitle: string; questions: MockQuestion[] };
export type MockAttempt = {
  id: string;
  uid: string;
  slug: string;
  lessonId: string;
  startedAt?: Timestamp;
  answers?: (number | null)[];
  score?: number;
  total?: number;
  submittedAt?: Timestamp;
};

export type MockTestInProgress = {
  status: "in_progress";
  lessonTitle: string;
  /** Deadline in ms on the server clock, and the server's time when we read it (for clock skew). */
  deadline: number;
  serverNow: number;
  questions: MockQuestion[];
};

export type MockTestResult = {
  status: "submitted";
  lessonTitle: string;
  score: number;
  total: number;
  questions: ReviewedQuestion[];
  answers: (number | null)[];
  submittedAt: number;
};

export type MockTestState = MockTestInProgress | MockTestResult;

const attemptRef = (uid: string, bank: QuestionBank) => doc(db, "mockTests", `${uid}_${bank.id}`);

/** The question banks for one course, keyed by lesson id; null while loading. */
export function useQuestionBanks(slug: string): Record<string, QuestionBank> | null {
  const [banks, setBanks] = useState<Record<string, QuestionBank> | null>(null);
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "questionBanks"), where("slug", "==", slug)),
        (snap) => setBanks(Object.fromEntries(snap.docs.map((d) => [d.data().lessonId, { id: d.id, ...d.data() } as QuestionBank]))),
        (err) => {
          console.warn("Couldn't load mock tests", err);
          setBanks({});
        },
      ),
    [slug],
  );
  return banks;
}

/** The learner's attempts for one course, keyed by lesson id; null while loading. */
export function useMyMockTests(uid: string, slug: string): Record<string, MockAttempt> | null {
  const [attempts, setAttempts] = useState<Record<string, MockAttempt> | null>(null);
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "mockTests"), where("uid", "==", uid), where("slug", "==", slug)),
        (snap) => setAttempts(Object.fromEntries(snap.docs.map((d) => [d.data().lessonId, { id: d.id, ...d.data() } as MockAttempt]))),
        (err) => {
          console.warn("Couldn't load mock test results", err);
          setAttempts({});
        },
      ),
    [uid, slug],
  );
  return attempts;
}

/** Reads the answer key (allowed once submitted), records the score if it isn't saved yet, and builds the review. */
async function loadResult(uid: string, bank: QuestionBank, attempt: MockAttempt): Promise<MockTestResult> {
  const key = (await getDoc(doc(db, "answerKeys", bank.id))).data() as { answers: number[]; explanations?: string[] } | undefined;
  const answers = attempt.answers ?? [];
  const score = attempt.score ?? bank.questions.reduce((s, _, i) => s + (key && answers[i] === key.answers[i] ? 1 : 0), 0);
  if (attempt.score === undefined && key) {
    // The rules accept only the score that matches the answer key.
    await updateDoc(attemptRef(uid, bank), { score }).catch((err) => console.warn("Couldn't save mock test score", err));
  }
  return {
    status: "submitted",
    lessonTitle: bank.lessonTitle,
    score,
    total: attempt.total ?? bank.questions.length,
    questions: bank.questions.map((q, i) => ({ ...q, answer: key?.answers[i] ?? -1, explanation: key?.explanations?.[i] ?? "" })),
    answers,
    submittedAt: attempt.submittedAt?.toMillis() ?? Date.now(),
  };
}

/** Starts the attempt (or resumes it); returns the result instead if it's already submitted or timed out. */
export async function startMockTest(uid: string, bank: QuestionBank): Promise<MockTestState> {
  const ref = attemptRef(uid, bank);
  let snap = await getDoc(ref);
  const fresh = !snap.exists();
  if (fresh) {
    await setDoc(ref, { uid, slug: bank.slug, lessonId: bank.lessonId, startedAt: serverTimestamp() });
    snap = await getDoc(ref);
  }
  const readAt = Date.now();
  const attempt = { id: snap.id, ...snap.data() } as MockAttempt;
  if (attempt.submittedAt) return loadResult(uid, bank, attempt);

  const started = attempt.startedAt?.toMillis() ?? readAt;
  const deadline = started + MOCK_TEST_MINUTES * 60_000;
  // A brand-new attempt's start time *is* the server's "now", which corrects for a wrong device clock.
  const serverNow = fresh ? started : readAt;
  // Time ran out while away: only a blank sheet is accepted now.
  if (serverNow > deadline + GRACE_MS) return submitMockTest(uid, bank, []);
  return { status: "in_progress", lessonTitle: bank.lessonTitle, deadline, serverNow, questions: bank.questions };
}

/** Submits the answers once, then loads the answer key and records the score. */
export async function submitMockTest(uid: string, bank: QuestionBank, answers: (number | null)[]): Promise<MockTestResult> {
  const ref = attemptRef(uid, bank);
  const started = (await getDoc(ref)).data()?.startedAt as Timestamp | undefined;
  const late = !started || Date.now() > started.toMillis() + MOCK_TEST_MINUTES * 60_000 + GRACE_MS;
  const clean = Array.from({ length: MOCK_TEST_QUESTIONS }, (_, i) => {
    const a = answers[i];
    return !late && typeof a === "number" && a >= 0 && a <= 3 ? a : null;
  });
  try {
    await updateDoc(ref, { answers: clean, total: MOCK_TEST_QUESTIONS, submittedAt: serverTimestamp() });
  } catch (err) {
    // The device clock was behind and the server says time is up: only a blank sheet is accepted.
    if ((err as { code?: string }).code !== "permission-denied" || clean.every((a) => a === null)) throw err;
    await updateDoc(ref, { answers: Array(MOCK_TEST_QUESTIONS).fill(null), total: MOCK_TEST_QUESTIONS, submittedAt: serverTimestamp() });
  }
  const snap = await getDoc(ref);
  return loadResult(uid, bank, { id: snap.id, ...snap.data() } as MockAttempt);
}

/** Turns a Firestore error into a message for the learner. */
export function mockTestError(err: unknown) {
  const code = (err as { code?: string }).code ?? "";
  if (code === "permission-denied") return "This test isn't open for you yet. Finish the lesson first, and make sure you're enrolled.";
  if (code === "unavailable") return "You're offline. Check your connection and try again.";
  return "Couldn't open this test. Please try again.";
}
