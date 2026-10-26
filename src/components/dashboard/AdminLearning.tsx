"use client";

import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useId, useState, type FormEvent } from "react";
import { BookIcon, CheckIcon, UsersIcon } from "../icons";
import { Card, CardTitle, EmptyState } from "./ui";
import { assignmentsFor, modulesFor } from "@/data/learning";
import { syllabusFor, useCatalog } from "@/lib/catalog";
import { db } from "@/lib/firebase";
import { isLiveClassLink, recordForLearner, saveLessonMeet, saveLessonVideo, useCourseVideos, type CourseProgress } from "@/lib/learning";

const input =
  "w-full rounded-2xl border border-forest-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";
const smallBtn = "rounded-full bg-forest-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-forest-600 disabled:opacity-50";

function LessonVideoRow({
  slug,
  id,
  title,
  url: savedUrl,
  free: savedFree,
  meet: savedMeet,
}: {
  slug: string;
  id: string;
  title: string;
  url: string;
  free: boolean;
  meet: string;
}) {
  const [url, setUrl] = useState(savedUrl);
  const [free, setFree] = useState(savedFree);
  const [meet, setMeet] = useState(savedMeet);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error" | "badMeet">("idle");
  const videoDirty = url.trim() !== savedUrl || free !== savedFree;
  const meetDirty = meet.trim() !== savedMeet;
  const dirty = videoDirty || meetDirty;

  useEffect(() => {
    setUrl(savedUrl);
    setFree(savedFree);
    setMeet(savedMeet);
  }, [savedUrl, savedFree, savedMeet]);

  const save = async () => {
    if (meet.trim() && !isLiveClassLink(meet)) return setState("badMeet");
    setState("saving");
    try {
      await Promise.all([videoDirty ? saveLessonVideo(slug, id, url, free) : null, meetDirty ? saveLessonMeet(slug, id, meet) : null]);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  return (
    <li className="grid items-center gap-2 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]">
      <p className="text-sm text-forest-950">{title}</p>
      <input
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setState("idle");
        }}
        placeholder="YouTube, Vimeo, Google Drive or .mp4 link"
        aria-label={`Video link for ${title}`}
        className={input}
      />
      <input
        value={meet}
        onChange={(e) => {
          setMeet(e.target.value);
          setState("idle");
        }}
        placeholder="Google Meet link (live class)"
        aria-label={`Live class link for ${title}`}
        className={`${input} ${state === "badMeet" ? "border-red-300" : ""}`}
      />
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} className="h-4 w-4 accent-forest-700" /> Free
      </label>
      <button type="button" onClick={save} disabled={!dirty || state === "saving"} className={smallBtn}>
        {state === "saving" ? "Saving…" : state === "saved" && !dirty ? "Saved" : state === "error" ? "Retry" : state === "badMeet" ? "Check link" : "Save"}
      </button>
    </li>
  );
}

/** Attach a video to each lesson and choose which ones are free previews. */
export function CourseContentCard() {
  const catalog = useCatalog(true);
  const [slug, setSlug] = useState(catalog[0].slug);
  const videos = useCourseVideos(slug, true);
  const modules = modulesFor(syllabusFor(catalog.find((c) => c.slug === slug)));

  return (
    <Card id="course-content">
      <CardTitle title="Course videos" />
      <p className="mt-1 text-sm text-slate-500">
        Paste a video link for each lesson (unlisted YouTube, Vimeo or Google Drive shared as &quot;Anyone with the link&quot;) and, optionally, a Google
        Meet link for its live class. Tick Free to make the video a preview; live-class links are shown only to enrolled students.
      </p>
      <select
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        aria-label="Course"
        className="mt-4 rounded-full border border-forest-100 bg-white px-4 py-2 text-sm font-semibold text-forest-900 outline-none focus:border-forest-300"
      >
        {catalog.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.title}
          </option>
        ))}
      </select>

      {!videos ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-5 space-y-5">
          {modules.map((m, i) => (
            <div key={m.title}>
              <p className="text-sm font-bold text-forest-950">
                {i + 1}. {m.title}
              </p>
              <ul className="divide-y divide-forest-100">
                {m.lessons.map((l) => (
                  <LessonVideoRow
                    key={`${slug}-${l.id}`}
                    slug={slug}
                    id={l.id}
                    title={l.title}
                    url={videos.free[l.id] ?? videos.paid[l.id] ?? ""}
                    free={!!videos.free[l.id]}
                    meet={videos.meet[l.id] ?? ""}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

type Record_ = CourseProgress & { id: string; uid: string; slug: string };
type Learner = { uid: string; name: string; email: string; memberId?: string };

function LearnerDetail({ record }: { record: Record_ }) {
  const id = useId();
  const syllabus = syllabusFor(useCatalog(true).find((c) => c.slug === record.slug));
  const assignments = assignmentsFor(syllabus);
  const lessons = modulesFor(syllabus).flatMap((m) => m.lessons);
  const today = new Date().toISOString().slice(0, 10);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [att, setAtt] = useState({ date: today, title: "", present: true });
  const [iv, setIv] = useState({ date: today, topic: record.interviewRequest?.topic ?? "", score: "", feedback: "" });
  const [grades, setGrades] = useState<Record<string, { score: string; feedback: string }>>({});

  const run = async (job: () => Promise<void>, done: string) => {
    setBusy(true);
    setMessage("");
    try {
      await job();
      setMessage(done);
    } catch {
      setMessage("Couldn't save. Check your connection and Firestore rules.");
    } finally {
      setBusy(false);
    }
  };

  const addAttendance = (e: FormEvent) => {
    e.preventDefault();
    if (!att.title.trim()) return setMessage("Add the session title.");
    run(() => recordForLearner(record.uid, record.slug, { attendance: { ...att, title: att.title.trim() } }), "Attendance saved.");
    setAtt({ ...att, title: "" });
  };

  const addInterview = (e: FormEvent) => {
    e.preventDefault();
    const score = Number(iv.score);
    if (!iv.topic.trim() || !(score >= 0 && score <= 10)) return setMessage("Add a topic and a score from 0 to 10.");
    run(
      () => recordForLearner(record.uid, record.slug, { interview: { date: iv.date, topic: iv.topic.trim(), score, ...(iv.feedback.trim() ? { feedback: iv.feedback.trim() } : {}) } }),
      "Interview result saved.",
    );
  };

  const saveGrade = (aid: string) => {
    const g = grades[aid];
    const score = Number(g?.score);
    if (!g || !(score >= 0 && score <= 100)) return setMessage("Enter a score from 0 to 100.");
    run(() => recordForLearner(record.uid, record.slug, { grade: { id: aid, score, feedback: g.feedback.trim() } }), "Grade saved.");
  };

  return (
    <div className="mt-5 space-y-5 rounded-2xl bg-forest-50/60 p-4">
      <p className="text-sm text-slate-600">
        {record.completed.length}/{lessons.length} lessons · {Object.keys(record.assignments).length}/{assignments.length} assignments submitted ·{" "}
        {record.attendance.length} sessions recorded
      </p>
      {message && <p className="text-sm font-medium text-forest-700">{message}</p>}

      {record.interviewRequest && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <strong>Mock interview requested:</strong> {record.interviewRequest.topic} on {record.interviewRequest.preferredDate}
          {record.interviewRequest.note && <> · “{record.interviewRequest.note}”</>}
        </p>
      )}

      <form onSubmit={addAttendance} className="grid gap-2 sm:grid-cols-[150px_1fr_auto_auto] sm:items-center">
        <input type="date" value={att.date} onChange={(e) => setAtt({ ...att, date: e.target.value })} aria-label="Session date" className={input} />
        <input value={att.title} onChange={(e) => setAtt({ ...att, title: e.target.value })} placeholder="Live session title" aria-label="Session title" className={input} />
        <select
          value={att.present ? "present" : "absent"}
          onChange={(e) => setAtt({ ...att, present: e.target.value === "present" })}
          aria-label="Attendance"
          className={input}
        >
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>
        <button type="submit" disabled={busy} className={smallBtn}>
          Add attendance
        </button>
      </form>

      <form onSubmit={addInterview} className="grid gap-2 sm:grid-cols-[150px_1fr_90px] sm:items-center">
        <input type="date" value={iv.date} onChange={(e) => setIv({ ...iv, date: e.target.value })} aria-label="Interview date" className={input} />
        <input value={iv.topic} onChange={(e) => setIv({ ...iv, topic: e.target.value })} placeholder="Mock interview topic" aria-label="Interview topic" className={input} />
        <input
          type="number"
          min={0}
          max={10}
          value={iv.score}
          onChange={(e) => setIv({ ...iv, score: e.target.value })}
          placeholder="/10"
          aria-label="Interview score out of 10"
          className={input}
        />
        <input
          value={iv.feedback}
          onChange={(e) => setIv({ ...iv, feedback: e.target.value })}
          placeholder="Feedback for the student"
          aria-label="Interview feedback"
          className={`${input} sm:col-span-2`}
        />
        <button type="submit" disabled={busy} className={smallBtn}>
          Add result
        </button>
      </form>

      <div>
        <p className="text-sm font-bold text-forest-950">Assignments</p>
        <ul className="mt-2 space-y-2">
          {assignments.map((a) => {
            const sub = record.assignments[a.id];
            const grade = record.grades[a.id];
            const g = grades[a.id] ?? { score: grade ? String(grade.score) : "", feedback: grade?.feedback ?? "" };
            return (
              <li key={a.id} className="rounded-2xl border border-forest-100 bg-white p-3">
                <p className="text-sm font-semibold text-forest-950">
                  {a.title}
                  {grade && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-forest-700">
                      <CheckIcon className="h-3 w-3" /> {grade.score}/100
                    </span>
                  )}
                </p>
                {sub ? (
                  <>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{sub.answer}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[90px_1fr_auto]">
                      <input
                        id={`${id}-${a.id}`}
                        type="number"
                        min={0}
                        max={100}
                        value={g.score}
                        onChange={(e) => setGrades({ ...grades, [a.id]: { ...g, score: e.target.value } })}
                        placeholder="/100"
                        aria-label="Score out of 100"
                        className={input}
                      />
                      <input
                        value={g.feedback}
                        onChange={(e) => setGrades({ ...grades, [a.id]: { ...g, feedback: e.target.value } })}
                        placeholder="Feedback"
                        aria-label="Feedback"
                        className={input}
                      />
                      <button type="button" onClick={() => saveGrade(a.id)} disabled={busy} className={smallBtn}>
                        {grade ? "Update grade" : "Grade"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Not submitted yet</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Each learner's course record: progress, attendance, interviews and grading. */
export function LearnersCard({ users }: { users: Learner[] | null }) {
  const [records, setRecords] = useState<Record_[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "progress"),
        (snap) =>
          setRecords(
            snap.docs.map(
              (d) => ({ completed: [], assignments: {}, docs: [], attendance: [], interviews: [], grades: {}, ...(d.data() as Partial<Record_>), id: d.id }) as Record_,
            ),
          ),
        () => setError("Couldn't load learner progress. Make sure the Firestore rules are deployed."),
      ),
    [],
  );

  const learner = (uid: string) => users?.find((u) => u.uid === uid);
  const catalog = useCatalog(true);
  const course = (slug: string) => catalog.find((c) => c.slug === slug);

  return (
    <Card id="learners">
      <CardTitle title="Learners" />
      <p className="mt-1 text-sm text-slate-500">Record live-session attendance and mock interview results, and grade assignments.</p>
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {records === null && !error ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : !records?.length ? (
        <EmptyState icon={UsersIcon} title="No learner activity yet">
          A record appears once an enrolled student opens their course.
        </EmptyState>
      ) : (
        <ul className="mt-5 space-y-3">
          {records.map((r) => {
            const u = learner(r.uid);
            const total = modulesFor(syllabusFor(course(r.slug))).flatMap((m) => m.lessons).length;
            const pendingGrades = Object.keys(r.assignments).filter((a) => !r.grades[a]).length;
            return (
              <li key={r.id} className="rounded-2xl border border-forest-100 p-4">
                <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full flex-wrap items-center gap-3 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-700 text-spark-400">
                    <BookIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-forest-950">
                      {u?.name ?? r.uid}
                      {u?.memberId && <span className="ml-2 font-mono text-xs text-forest-700">{u.memberId}</span>}
                    </span>
                    <span className="block text-xs text-slate-500">{course(r.slug)?.title ?? r.slug}</span>
                  </span>
                  <span className="text-sm font-semibold text-forest-700">{total ? Math.round((r.completed.length / total) * 100) : 0}%</span>
                  {pendingGrades > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{pendingGrades} to grade</span>}
                  {r.interviewRequest && <span className="rounded-full bg-spark-500/25 px-2.5 py-0.5 text-xs font-semibold text-forest-800">Interview request</span>}
                </button>
                {open === r.id && <LearnerDetail record={r} />}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
