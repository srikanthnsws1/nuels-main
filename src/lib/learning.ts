"use client";

import { arrayRemove, arrayUnion, deleteField, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

/**
 * A learner's record for one course: `progress/{uid}_{slug}`.
 * The learner writes: completed lessons, assignment answers, mock interview requests and the
 * document checklist. Only admins/mentors write: attendance, interview results and grades.
 * firestore.rules enforce the split.
 */
export type AttendanceEntry = { date: string; title: string; present: boolean };
export type InterviewResult = { date: string; topic: string; score: number; feedback?: string };
export type Grade = { score: number; feedback?: string };

export type CourseProgress = {
  completed: string[];
  lastLesson?: string;
  assignments: Record<string, { answer: string; submittedAt?: Timestamp }>;
  interviewRequest?: { preferredDate: string; topic: string; note?: string; requestedAt?: Timestamp };
  docs: string[];
  // Written by admins/mentors.
  attendance: AttendanceEntry[];
  interviews: InterviewResult[];
  grades: Record<string, Grade>;
};

const empty: CourseProgress = { completed: [], assignments: {}, docs: [], attendance: [], interviews: [], grades: {} };

const progressRef = (uid: string, slug: string) => doc(db, "progress", `${uid}_${slug}`);

/** Live progress for one course; null while loading. */
export function useCourseProgress(uid: string, slug: string): CourseProgress | null {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  useEffect(
    () =>
      onSnapshot(
        progressRef(uid, slug),
        (snap) => setProgress({ ...empty, ...(snap.data() as Partial<CourseProgress> | undefined) }),
        (err) => {
          console.warn("Couldn't load course progress", err);
          setProgress(empty);
        },
      ),
    [uid, slug],
  );
  return progress;
}

/** Merges learner-owned fields into the progress record, creating it on first use. */
function save(uid: string, slug: string, data: Record<string, unknown>) {
  return setDoc(progressRef(uid, slug), { uid, slug, ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function setLessonDone(uid: string, slug: string, lessonId: string, done: boolean) {
  return save(uid, slug, { completed: done ? arrayUnion(lessonId) : arrayRemove(lessonId), lastLesson: lessonId });
}

export function openLesson(uid: string, slug: string, lessonId: string) {
  return save(uid, slug, { lastLesson: lessonId });
}

export function submitAssignment(uid: string, slug: string, assignmentId: string, answer: string) {
  return save(uid, slug, { assignments: { [assignmentId]: { answer: answer.trim(), submittedAt: serverTimestamp() } } });
}

export function requestMockInterview(uid: string, slug: string, request: { preferredDate: string; topic: string; note: string }) {
  return save(uid, slug, {
    interviewRequest: { preferredDate: request.preferredDate, topic: request.topic.trim(), note: request.note.trim(), requestedAt: serverTimestamp() },
  });
}

export function cancelMockInterviewRequest(uid: string, slug: string) {
  return save(uid, slug, { interviewRequest: deleteField() });
}

export function setDocumentReady(uid: string, slug: string, item: string, ready: boolean) {
  return save(uid, slug, { docs: ready ? arrayUnion(item) : arrayRemove(item) });
}

/**
 * Lesson videos, managed by admins. Free previews live in `courseContent/{slug}` (any signed-in
 * user); the rest in `courseContent/{slug}/paid/videos`, which only enrolled learners can read.
 */
export type VideoMap = Record<string, string>;

export function useCourseVideos(slug: string, enrolled: boolean): { free: VideoMap; paid: VideoMap } | null {
  const [free, setFree] = useState<VideoMap | null>(null);
  const [paid, setPaid] = useState<VideoMap | null>(null);

  useEffect(
    () =>
      onSnapshot(
        doc(db, "courseContent", slug),
        (snap) => setFree((snap.data()?.free as VideoMap | undefined) ?? {}),
        () => setFree({}),
      ),
    [slug],
  );
  useEffect(() => {
    if (!enrolled) return setPaid({});
    return onSnapshot(
      doc(db, "courseContent", slug, "paid", "videos"),
      (snap) => setPaid((snap.data()?.videos as VideoMap | undefined) ?? {}),
      () => setPaid({}),
    );
  }, [slug, enrolled]);

  return free && paid ? { free, paid } : null;
}

/** Admin: sets (or clears, with an empty url) a lesson's video, as a free preview or paid. */
export async function saveLessonVideo(slug: string, lessonId: string, url: string, free: boolean) {
  const clean = url.trim();
  await Promise.all([
    setDoc(doc(db, "courseContent", slug), { free: { [lessonId]: clean && free ? clean : deleteField() } }, { merge: true }),
    setDoc(doc(db, "courseContent", slug, "paid", "videos"), { videos: { [lessonId]: clean && !free ? clean : deleteField() } }, { merge: true }),
  ]);
}

/** Admin: records a live session's attendance or a mock interview result for a learner. */
export function recordForLearner(uid: string, slug: string, data: { attendance?: AttendanceEntry; interview?: InterviewResult; grade?: { id: string } & Grade }) {
  return updateDoc(progressRef(uid, slug), {
    ...(data.attendance ? { attendance: arrayUnion(data.attendance) } : {}),
    ...(data.interview ? { interviews: arrayUnion(data.interview), interviewRequest: deleteField() } : {}),
    ...(data.grade ? { [`grades.${data.grade.id}`]: { score: data.grade.score, ...(data.grade.feedback ? { feedback: data.grade.feedback } : {}) } } : {}),
  });
}
