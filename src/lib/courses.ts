"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import type { AppUser } from "./auth";
import { db } from "./firebase";

/**
 * Courses, enrollments and live sessions, all stored in Firestore:
 * - `courses/{id}`: posted and edited only by the mentor who owns it, readable by everyone.
 * - `courses/{id}/sessions/{id}`: the mentor's Google Meet links, readable by that course's
 *   students whose payment is approved, the mentor and admins.
 * - `enrollments/{courseId}_{studentUid}`: created by the student, readable by the student,
 *   the course's mentor and admins; only admins approve or reject payments.
 * - `courses/{id}/recordings/{id}`: YouTube recordings by topic, same access as sessions.
 * - `paymentProofs/{enrollmentId}`: the payment screenshot, for the student and admins only.
 * firestore.rules enforces all of this; the helpers here only shape the data.
 */

export const courseCategories = ["Design", "Development", "Marketing", "Business", "Language", "Photography"] as const;
export type CourseCategory = (typeof courseCategories)[number];

export const courseLevels = ["Beginner", "Intermediate", "Advanced"] as const;
export type CourseLevel = (typeof courseLevels)[number];

export type CourseInput = {
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  lessons: number;
  hours: number;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  outcomes: string[];
  curriculum: string[];
  /** The mentor shown on the course: name, designation (e.g. "Software Engineer") and photo. */
  mentorName: string;
  mentorDesignation: string;
  /** Small JPEG data URL, usually the mentor's profile picture. */
  mentorPhoto?: string;
};

export type Course = CourseInput & {
  id: string;
  mentorId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

/** A recorded class: a YouTube video the mentor posted under a topic of the course. */
export type Recording = {
  id: string;
  topic: string;
  title: string;
  videoId: string;
  mentorId: string;
  createdAt?: Timestamp;
};

/**
 * Paid enrollments start as "pending" with a payment screenshot and unlock ("approved")
 * once an admin verifies the payment. Free courses are approved straight away.
 */
export type EnrollmentStatus = "pending" | "approved" | "rejected";

export type Enrollment = {
  id: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentMemberId?: string;
  mentorId: string;
  status: EnrollmentStatus;
  amount: number;
  /** UPI / bank transaction ID the student typed in, if any. */
  paymentRef: string;
  createdAt?: Timestamp;
  reviewedAt?: Timestamp;
};

export const enrollmentStatusLabel: Record<EnrollmentStatus, string> = {
  pending: "Payment under review",
  approved: "Active",
  rejected: "Payment not verified",
};

export type SessionInput = { topic: string; date: string; time: string; meetLink: string };

export type LiveSession = SessionInput & {
  id: string;
  courseId: string;
  courseTitle: string;
  mentorId: string;
  mentorName: string;
  createdAt?: Timestamp;
};

const categoryImage: Record<CourseCategory, string> = {
  Design: "/images/cat-design.webp",
  Development: "/images/cat-webdev.webp",
  Marketing: "/images/cat-marketing.webp",
  Business: "/images/cat-business.webp",
  Language: "/images/cat-language.webp",
  Photography: "/images/cat-photo.webp",
};

/** The mentor's cover image, else a stock image for the category. */
export function courseImage(course: Pick<Course, "imageUrl" | "category">) {
  return course.imageUrl || categoryImage[course.category] || "/images/hero.webp";
}

/** Course pages are rendered in the browser, so the ID travels in the query string. */
export function coursePath(id: string) {
  return `/courses/view?id=${encodeURIComponent(id)}`;
}

export const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Same pattern as firestore.rules: only Google Meet links are accepted. */
export const meetLinkPattern = /^https:\/\/meet\.google\.com\/[A-Za-z0-9/_-]+(\?.*)?$/;

/** "2026-10-23" for the given day in the viewer's time zone. */
export function localDate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

/** "Today · 6:00 pm" / "Fri, 24 Oct · 6:00 pm" */
export function sessionWhen(s: Pick<LiveSession, "date" | "time">) {
  const at = new Date(`${s.date}T${s.time}`);
  const day = s.date === localDate() ? "Today" : dayFormat.format(at);
  return `${day} · ${timeFormat.format(at)}`;
}

export function sortSessions(list: LiveSession[]) {
  return [...list].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

function toCourse(id: string, data: Record<string, unknown>): Course {
  return { outcomes: [], curriculum: [], ...data, id } as unknown as Course;
}

/** Every course in the catalog, newest first. `courses` is null while loading. */
export function useCourses() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState("");
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "courses"), orderBy("createdAt", "desc")),
        (snap) => setCourses(snap.docs.map((d) => toCourse(d.id, d.data()))),
        () => setError("Couldn't load courses. Please refresh the page."),
      ),
    [],
  );
  return { courses, error };
}

export async function getCourse(id: string): Promise<Course | null> {
  const snap = await getDoc(doc(db, "courses", id));
  return snap.exists() ? toCourse(snap.id, snap.data()) : null;
}

/** Courses taught by one mentor, kept live. */
export function useMentorCourses(mentorId: string) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  useEffect(
    () =>
      onSnapshot(query(collection(db, "courses"), where("mentorId", "==", mentorId)), (snap) =>
        setCourses(
          snap.docs
            .map((d) => toCourse(d.id, d.data()))
            .sort((a, b) => (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now())),
        ),
      ),
    [mentorId],
  );
  return courses;
}

/** Drops empty optional fields so they match the shape firestore.rules expects. */
function courseFields(input: CourseInput) {
  const { oldPrice, imageUrl, mentorPhoto, ...rest } = input;
  return {
    ...rest,
    ...(oldPrice ? { oldPrice } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(mentorPhoto ? { mentorPhoto } : {}),
  };
}

export async function createCourse(mentor: AppUser, input: CourseInput) {
  const ref = await addDoc(collection(db, "courses"), {
    ...courseFields(input),
    mentorId: mentor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCourse(mentor: AppUser, course: Course, input: CourseInput) {
  // setDoc (not updateDoc) so cleared optional fields are removed.
  await setDoc(doc(db, "courses", course.id), {
    ...courseFields(input),
    mentorId: mentor.uid,
    createdAt: course.createdAt,
    updatedAt: serverTimestamp(),
  });
}

/** Removes the course with its sessions and recordings. Enrollments stay for the admin's records. */
export async function deleteCourse(courseId: string) {
  const [sessions, recordings] = await Promise.all([
    getDocs(collection(db, "courses", courseId, "sessions")),
    getDocs(collection(db, "courses", courseId, "recordings")),
  ]);
  const batch = writeBatch(db);
  [...sessions.docs, ...recordings.docs].forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await deleteDoc(doc(db, "courses", courseId));
}

/**
 * The 11-character video ID from any common YouTube link (watch, youtu.be, embed,
 * shorts, live), or null if it isn't one.
 */
export function youtubeId(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** Privacy-enhanced embed URL for playing a recording inside the dashboard. */
export function youtubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/** Recorded classes of a course, oldest first, kept live. Empty if access is denied. */
export function useRecordings(courseId: string | null) {
  const [state, setState] = useState<{ courseId: string | null; list: Recording[] }>({ courseId: null, list: [] });
  useEffect(() => {
    if (!courseId) return;
    return onSnapshot(
      query(collection(db, "courses", courseId, "recordings"), orderBy("createdAt", "asc")),
      (snap) => setState({ courseId, list: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recording) }),
      () => setState({ courseId, list: [] }),
    );
  }, [courseId]);
  return state.courseId === courseId ? state.list : null;
}

/** Groups recordings by topic, keeping topics in the order they were first posted. */
export function byTopic(list: Recording[]) {
  const groups = new Map<string, Recording[]>();
  list.forEach((r) => groups.set(r.topic, [...(groups.get(r.topic) ?? []), r]));
  return [...groups].map(([topic, recordings]) => ({ topic, recordings }));
}

export async function addRecording(mentor: AppUser, courseId: string, input: { topic: string; title: string; videoId: string }) {
  await addDoc(collection(db, "courses", courseId, "recordings"), { ...input, mentorId: mentor.uid, createdAt: serverTimestamp() });
}

export function deleteRecording(courseId: string, recordingId: string) {
  return deleteDoc(doc(db, "courses", courseId, "recordings", recordingId));
}

function toEnrollment(id: string, data: Record<string, unknown>): Enrollment {
  // Enrollments made before payment verification existed count as pending.
  return { status: "pending", amount: 0, paymentRef: "", ...data, id } as Enrollment;
}

/** The student's enrollment in a course, if any. */
export async function findEnrollment(studentId: string, courseId: string): Promise<Enrollment | null> {
  const snap = await getDocs(
    query(collection(db, "enrollments"), where("studentId", "==", studentId), where("courseId", "==", courseId)),
  );
  return snap.empty ? null : toEnrollment(snap.docs[0].id, snap.docs[0].data());
}

export type PaymentProof = { image: string; paymentRef: string };

/**
 * Enrolls a student. Paid courses need the payment screenshot and stay locked ("pending")
 * until an admin approves them; free courses are approved immediately. A student whose
 * payment was rejected can call this again with a new screenshot. Returns the resulting status.
 */
export async function enroll(student: AppUser, course: Course, payment?: PaymentProof): Promise<EnrollmentStatus> {
  const id = `${course.id}_${student.uid}`;
  const existing = await findEnrollment(student.uid, course.id);
  if (existing && existing.status !== "rejected") return existing.status;

  const free = !course.price;
  if (!free && !payment) throw new Error("Payment proof is required for paid courses");

  const batch = writeBatch(db);
  if (payment) {
    batch.set(doc(db, "paymentProofs", id), { studentId: student.uid, image: payment.image, uploadedAt: serverTimestamp() });
  }
  if (existing) {
    batch.update(doc(db, "enrollments", id), { status: "pending", paymentRef: payment?.paymentRef ?? "", resubmittedAt: serverTimestamp() });
  } else {
    batch.set(doc(db, "enrollments", id), {
      courseId: course.id,
      courseTitle: course.title,
      studentId: student.uid,
      studentName: student.name,
      studentEmail: student.email,
      ...(student.memberId ? { studentMemberId: student.memberId } : {}),
      mentorId: course.mentorId,
      status: free ? "approved" : "pending",
      amount: course.price,
      paymentRef: payment?.paymentRef ?? "",
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return free ? "approved" : "pending";
}

/** Admin only: accept or reject a student's payment. */
export function reviewEnrollment(admin: AppUser, enrollmentId: string, status: "approved" | "rejected") {
  return updateDoc(doc(db, "enrollments", enrollmentId), { status, reviewedBy: admin.uid, reviewedAt: serverTimestamp() });
}

/** The payment screenshot (a JPEG data URL), readable by admins and the student who uploaded it. */
export async function getPaymentProof(enrollmentId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "paymentProofs", enrollmentId));
  return snap.exists() ? (snap.data().image as string) : null;
}

export type CourseEarning = {
  courseId: string;
  title: string;
  price: number;
  /** Students whose payment the admin approved. */
  paidStudents: number;
  /** Payments still waiting for admin verification. */
  pendingStudents: number;
  /** Sum of the verified payments (the price each student paid when enrolling). */
  earned: number;
  pendingAmount: number;
};

/**
 * Course-wise earnings: verified payments per course. Each enrollment keeps the price paid
 * at the time, so later price changes don't rewrite past earnings.
 */
export function courseEarnings(courses: Course[], enrollments: Enrollment[]): CourseEarning[] {
  return courses.map((c) => {
    const mine = enrollments.filter((e) => e.courseId === c.id);
    const paid = mine.filter((e) => e.status === "approved");
    const pending = mine.filter((e) => e.status === "pending");
    return {
      courseId: c.id,
      title: c.title,
      price: c.price,
      paidStudents: paid.length,
      pendingStudents: pending.length,
      earned: paid.reduce((s, e) => s + (e.amount || 0), 0),
      pendingAmount: pending.reduce((s, e) => s + (e.amount || 0), 0),
    };
  });
}

function useEnrollments(field: "studentId" | "mentorId", uid: string) {
  const [list, setList] = useState<Enrollment[] | null>(null);
  useEffect(
    () =>
      onSnapshot(query(collection(db, "enrollments"), where(field, "==", uid)), (snap) =>
        setList(
          snap.docs
            .map((d) => toEnrollment(d.id, d.data()))
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
        ),
      ),
    [field, uid],
  );
  return list;
}

/** Every enrollment on the platform (admins only), kept live. */
export function useAllEnrollments() {
  const [list, setList] = useState<Enrollment[] | null>(null);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "enrollments"),
        (snap) =>
          setList(
            snap.docs
              .map((d) => toEnrollment(d.id, d.data()))
              .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
          ),
        () => setList([]),
      ),
    [],
  );
  return list;
}

export const useStudentEnrollments = (studentId: string) => useEnrollments("studentId", studentId);
export const useMentorEnrollments = (mentorId: string) => useEnrollments("mentorId", mentorId);

/**
 * Today's and upcoming sessions for the given courses, kept live so a link the mentor
 * posts shows up without a refresh. One listener per course: the security rules check
 * access per course, so a single query across courses isn't allowed for students.
 */
export function useUpcomingSessions(courseIds: string[]) {
  const [byCourse, setByCourse] = useState<Record<string, LiveSession[]>>({});
  // The set of course IDs whose listeners have all reported back.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const key = [...new Set(courseIds)].sort().join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    setByCourse({});
    if (ids.length === 0) setLoadedKey(key);
    const seen = new Set<string>();
    const done = (id: string) => {
      seen.add(id);
      if (seen.size === ids.length) setLoadedKey(key);
    };
    const unsubs = ids.map((id) =>
      onSnapshot(
        query(collection(db, "courses", id, "sessions"), where("date", ">=", localDate())),
        (snap) => {
          setByCourse((m) => ({ ...m, [id]: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LiveSession) }));
          done(id);
        },
        // e.g. the course was deleted: treat it as having no sessions.
        () => done(id),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [key]);

  const loaded = loadedKey === key;
  return { sessions: loaded ? sortSessions(Object.values(byCourse).flat()) : [], loaded };
}

export async function addSession(mentor: AppUser, course: Course, input: SessionInput) {
  await addDoc(collection(db, "courses", course.id, "sessions"), {
    ...input,
    courseId: course.id,
    courseTitle: course.title,
    mentorId: mentor.uid,
    mentorName: mentor.name,
    createdAt: serverTimestamp(),
  });
}

export function deleteSession(session: LiveSession) {
  return deleteDoc(doc(db, "courses", session.courseId, "sessions", session.id));
}
