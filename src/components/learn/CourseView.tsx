"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import DashboardShell, { type Section } from "../dashboard/DashboardShell";
import { Card, CardTitle, EmptyState, ProgressBar, WelcomeBanner } from "../dashboard/ui";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardIcon,
  GraduationIcon,
  GridIcon,
  LockIcon,
  PlayIcon,
  StarIcon,
  UsersIcon,
} from "../icons";
import { assignmentsFor, documentsFor, embedUrl, modulesFor, type Lesson } from "@/data/learning";
import type { AppUser } from "@/lib/auth";
import { courseHref, syllabusFor, useCatalogLoaded, useCourse, type CatalogCourse } from "@/lib/catalog";
import {
  cancelMockInterviewRequest,
  openLesson,
  requestMockInterview,
  setDocumentReady,
  setLessonDone,
  submitAssignment,
  useCourseProgress,
  useCourseVideos,
  type CourseProgress,
} from "@/lib/learning";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "lessons", label: "Course index & videos", icon: PlayIcon },
  { id: "free-videos", label: "Free videos", icon: StarIcon },
  { id: "assignments", label: "Assignments", icon: ClipboardIcon },
  { id: "interviews", label: "Mock interviews", icon: UsersIcon },
  { id: "attendance", label: "Attendance", icon: CalendarIcon },
  { id: "performance", label: "Performance report", icon: BriefcaseIcon },
  { id: "documents", label: "Documents preparation", icon: BookIcon },
  { id: "certificate", label: "Certificate", icon: GraduationIcon },
];

const sidebarCard = (
  <Link
    href="/dashboard"
    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
  >
    <ArrowLeftIcon className="h-4 w-4" /> Back to dashboard
  </Link>
);

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const formatDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? dateFormat.format(new Date(`${iso}T00:00:00`)) : iso);

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-forest-100">{label}</p>
      {sub && <p className="text-[11px] text-forest-300">{sub}</p>}
    </div>
  );
}

function Player({ lesson, url, done, onToggle, onPrev, onNext }: {
  lesson: Lesson;
  url?: string;
  done: boolean;
  onToggle: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const embed = url ? embedUrl(url) : null;
  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-forest-950">
        {url && embed ? (
          <iframe
            key={embed}
            src={embed}
            title={lesson.title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : url ? (
          <video key={url} src={url} controls controlsList="nodownload" className="absolute inset-0 h-full w-full" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-spark-400">
              <PlayIcon className="h-6 w-6" />
            </span>
            <p className="font-semibold text-white">Video coming soon</p>
            <p className="max-w-sm text-sm text-forest-200">Your mentor is uploading this lesson. It&apos;s covered in the live sessions meanwhile.</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-600">Module {lesson.module + 1}</p>
          <h3 className="text-lg font-bold text-forest-950">{lesson.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="Previous lesson"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-forest-100 text-forest-700 transition hover:bg-forest-50 disabled:opacity-40"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              done ? "bg-spark-500 text-forest-900 hover:bg-spark-400" : "bg-forest-700 text-white hover:bg-forest-600"
            }`}
          >
            <CheckIcon className="h-4 w-4" /> {done ? "Completed" : "Mark as complete"}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            aria-label="Next lesson"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-forest-100 text-forest-700 transition hover:bg-forest-50 disabled:opacity-40"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignmentItem({ user, slug, a, progress }: { user: AppUser; slug: string; a: ReturnType<typeof assignmentsFor>[number]; progress: CourseProgress }) {
  const submitted = progress.assignments[a.id];
  const grade = progress.grades[a.id];
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState(submitted?.answer ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (answer.trim().length < 30) return setError("Please write at least a few sentences (30+ characters).");
    setSaving(true);
    setError("");
    try {
      await submitAssignment(user.uid, slug, a.id, answer);
      setOpen(false);
    } catch {
      setError("Couldn't submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const status = grade ? `Graded · ${grade.score}/100` : submitted ? "Submitted · awaiting review" : "Not started";
  const tone = grade ? "bg-spark-500/25 text-forest-800" : submitted ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500";

  return (
    <li className="rounded-2xl border border-forest-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-forest-600">Module {a.module + 1}</p>
          <p className="font-semibold text-forest-950">{a.title}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{status}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.brief}</p>
      {grade?.feedback && (
        <p className="mt-3 rounded-2xl bg-forest-50 px-4 py-3 text-sm text-forest-900">
          <strong>Feedback:</strong> {grade.feedback}
        </p>
      )}
      {open ? (
        <form onSubmit={submit} className="mt-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={6}
            maxLength={5000}
            placeholder="Write your answer and paste links to your work…"
            className="w-full rounded-2xl border border-forest-100 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-forest-300"
          />
          {error && <p className="mt-1 text-sm font-medium text-red-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-forest-600 disabled:opacity-60"
            >
              {saving ? "Submitting…" : submitted ? "Resubmit" : "Submit"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-forest-50">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        !grade && (
          <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-semibold text-forest-700 hover:text-forest-500">
            {submitted ? "Edit submission" : "Start assignment"} →
          </button>
        )
      )}
    </li>
  );
}

function InterviewRequestForm({ user, slug }: { user: AppUser; slug: string }) {
  const id = useId();
  const [preferredDate, setPreferredDate] = useState("");
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!preferredDate || !topic.trim()) return setError("Pick a date and tell us what to focus on.");
    setSaving(true);
    setError("");
    try {
      await requestMockInterview(user.uid, slug, { preferredDate, topic, note });
    } catch {
      setError("Couldn't send your request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-2xl border border-forest-100 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-forest-300";
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl bg-forest-50/70 p-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${id}-date`} className="mb-1 block text-sm font-medium text-forest-900">
          Preferred date
        </label>
        <input id={`${id}-date`} type="date" min={today} value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className={input} />
      </div>
      <div>
        <label htmlFor={`${id}-topic`} className="mb-1 block text-sm font-medium text-forest-900">
          Focus
        </label>
        <input id={`${id}-topic`} value={topic} maxLength={80} placeholder="e.g. Portfolio walkthrough, HR round" onChange={(e) => setTopic(e.target.value)} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-note`} className="mb-1 block text-sm font-medium text-forest-900">
          Anything else? <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input id={`${id}-note`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={input} />
      </div>
      {error && <p className="text-sm font-medium text-red-600 sm:col-span-2">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-600 disabled:opacity-60"
      >
        {saving ? "Sending…" : "Request mock interview"}
      </button>
    </form>
  );
}

function printCertificate(name: string, course: CatalogCourse, memberId?: string) {
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  const date = dateFormat.format(new Date());
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  win.document.write(`<!doctype html><html><head><title>Certificate - ${esc(course.title)}</title><style>
    @page { size: A4 landscape; margin: 0 }
    body { margin: 0; font-family: Georgia, serif; background: #f3f8f5; }
    .c { box-sizing: border-box; width: 297mm; height: 210mm; padding: 18mm; background: #fff; border: 10px solid #114b3c; outline: 3px solid #a6e81f; outline-offset: -22px; text-align: center; display: flex; flex-direction: column; justify-content: center; }
    .b { font: 700 18px Arial, sans-serif; color: #114b3c; letter-spacing: 4px; text-transform: uppercase }
    h1 { font-size: 46px; color: #0d3b30; margin: 14px 0 6px }
    .n { font-size: 40px; color: #114b3c; border-bottom: 2px solid #a6e81f; display: inline-block; padding: 0 30px 6px; margin: 18px auto }
    p { font: 17px Arial, sans-serif; color: #475569; margin: 6px 0 }
    .t { font-size: 26px; color: #0d3b30; font-weight: 700; margin: 10px 0 }
    .f { display: flex; justify-content: space-between; margin-top: 36px; font: 14px Arial, sans-serif; color: #475569 }
  </style></head><body><div class="c">
    <div class="b">nuelsmart</div><h1>Certificate of Completion</h1><p>This is to certify that</p>
    <div class="n">${esc(name)}</div><p>has successfully completed the course</p><div class="t">${esc(course.title)}</div>
    <p>mentored by ${esc(course.mentor)}</p>
    <div class="f"><span>Date: ${date}</span><span>${memberId ? `Member ID: ${esc(memberId)}` : ""}</span><span>www.nuelsmart.com</span></div>
  </div><script>window.onload = () => window.print()</script></body></html>`);
  win.document.close();
}

function CourseContent({ user, course }: { user: AppUser; course: CatalogCourse }) {
  const slug = course.slug;
  const progress = useCourseProgress(user.uid, slug);
  const videos = useCourseVideos(slug, true);
  const syllabus = syllabusFor(course);
  const modules = modulesFor(syllabus);
  const lessons = modules.flatMap((m) => m.lessons);
  const assignments = assignmentsFor(syllabus);
  const documents = documentsFor(slug);
  const [current, setCurrent] = useState<string | null>(null);

  // Start where the learner left off.
  useEffect(() => {
    if (progress && current === null) setCurrent(progress.lastLesson ?? lessons.find((l) => !progress.completed.includes(l.id))?.id ?? lessons[0]?.id ?? "");
  }, [progress, current, lessons]);

  if (!progress || !videos) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" aria-label="Loading" />
      </div>
    );
  }

  const videoFor = (id: string) => videos.paid[id] ?? videos.free[id];
  const done = progress.completed.filter((id) => lessons.some((l) => l.id === id));
  const coursePct = pct(done.length, lessons.length);
  const submitted = assignments.filter((a) => progress.assignments[a.id]);
  const graded = assignments.map((a) => progress.grades[a.id]).filter(Boolean);
  const avgGrade = graded.length ? Math.round(graded.reduce((s, g) => s + g.score, 0) / graded.length) : null;
  const attended = progress.attendance.filter((a) => a.present).length;
  const attendancePct = progress.attendance.length ? pct(attended, progress.attendance.length) : null;
  const interviewAvg = progress.interviews.length
    ? Math.round((progress.interviews.reduce((s, i) => s + i.score, 0) / progress.interviews.length) * 10) / 10
    : null;
  const docsReady = documents.filter((d) => progress.docs.includes(d));
  const certificateReady = coursePct === 100 && submitted.length === assignments.length;

  const index = lessons.findIndex((l) => l.id === current);
  const lesson = lessons[index] ?? lessons[0];
  const play = (id: string) => {
    setCurrent(id);
    openLesson(user.uid, slug, id).catch(() => {});
    document.getElementById("lessons")?.scrollIntoView({ behavior: "smooth" });
  };
  const toggle = (id: string) => setLessonDone(user.uid, slug, id, !progress.completed.includes(id)).catch((err) => console.error(err));
  const freeLessons = lessons.filter((l) => videos.free[l.id]);
  const nextUp = lessons.find((l) => !progress.completed.includes(l.id));

  const report = [
    { label: "Course progress", value: coursePct, text: `${done.length}/${lessons.length} lessons` },
    { label: "Assignments submitted", value: pct(submitted.length, assignments.length), text: `${submitted.length}/${assignments.length}` },
    { label: "Average assignment score", value: avgGrade, text: avgGrade === null ? "Not graded yet" : `${avgGrade}/100` },
    { label: "Attendance", value: attendancePct, text: attendancePct === null ? "No sessions yet" : `${attended}/${progress.attendance.length} sessions` },
    { label: "Mock interviews", value: interviewAvg === null ? null : interviewAvg * 10, text: interviewAvg === null ? "None yet" : `${interviewAvg}/10 average` },
    { label: "Documents ready", value: pct(docsReady.length, documents.length), text: `${docsReady.length}/${documents.length}` },
  ];
  const scored = report.filter((r) => r.value !== null);
  const overall = Math.round(scored.reduce((s, r) => s + (r.value ?? 0), 0) / scored.length);

  return (
    <>
      <WelcomeBanner id="overview" title={course.title}>
        <p className="mt-2 text-sm text-forest-100">
          with {course.mentor} · {lessons.length} lessons · {course.hours} hours
        </p>
        <div className="mt-5 max-w-md">
          <div className="flex items-center justify-between text-sm font-semibold text-white">
            <span>Your progress</span>
            <span>{coursePct}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-spark-500 transition-all" style={{ width: `${coursePct}%` }} />
          </div>
        </div>
        <div className="mt-5 grid max-w-xl grid-cols-3 gap-3">
          <Stat label="Lessons done" value={`${done.length}/${lessons.length}`} />
          <Stat label="Assignments" value={`${submitted.length}/${assignments.length}`} />
          <Stat label="Attendance" value={attendancePct === null ? "—" : `${attendancePct}%`} />
        </div>
        {nextUp && (
          <button
            type="button"
            onClick={() => play(nextUp.id)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-spark-500 px-6 py-3 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400"
          >
            <PlayIcon className="h-4 w-4" /> {done.length ? "Continue" : "Start"}: {nextUp.title}
          </button>
        )}
      </WelcomeBanner>

      <Card id="lessons">
        <CardTitle title="Course index & videos" action={<span className="text-sm font-semibold text-forest-700">{coursePct}% complete</span>} />
        <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_360px]">
          {lesson && (
            <Player
              lesson={lesson}
              url={videoFor(lesson.id)}
              done={progress.completed.includes(lesson.id)}
              onToggle={() => toggle(lesson.id)}
              onPrev={index > 0 ? () => play(lessons[index - 1].id) : undefined}
              onNext={index < lessons.length - 1 ? () => play(lessons[index + 1].id) : undefined}
            />
          )}
          <ol className="max-h-[560px] space-y-4 overflow-y-auto pr-1" data-lenis-prevent>
            {modules.map((m, i) => {
              const mDone = m.lessons.filter((l) => progress.completed.includes(l.id)).length;
              return (
                <li key={m.title}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-forest-950">
                      {i + 1}. {m.title}
                    </p>
                    <span className="shrink-0 text-xs text-slate-500">
                      {mDone}/{m.lessons.length}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {m.lessons.map((l) => {
                      const isDone = progress.completed.includes(l.id);
                      const active = l.id === lesson?.id;
                      return (
                        <li key={l.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${active ? "bg-forest-50" : "hover:bg-forest-50/60"}`}>
                          <button
                            type="button"
                            onClick={() => toggle(l.id)}
                            aria-label={isDone ? `Mark ${l.title} as not done` : `Mark ${l.title} as done`}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isDone ? "bg-forest-600 text-white" : "border border-slate-300"}`}
                          >
                            {isDone && <CheckIcon className="h-3 w-3" />}
                          </button>
                          <button type="button" onClick={() => play(l.id)} className={`min-w-0 flex-1 text-left text-sm ${active ? "font-semibold text-forest-800" : "text-slate-700"}`}>
                            {l.title}
                          </button>
                          {videos.free[l.id] ? (
                            <span className="rounded-full bg-spark-500/25 px-2 py-0.5 text-[10px] font-bold text-forest-800">FREE</span>
                          ) : videos.paid[l.id] ? (
                            <PlayIcon className="h-3.5 w-3.5 shrink-0 text-forest-600" />
                          ) : (
                            <span className="text-[10px] text-slate-400">Soon</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <Card id="free-videos">
        <CardTitle title="Free videos" />
        {freeLessons.length === 0 ? (
          <EmptyState icon={StarIcon} title="No free videos yet">
            Free preview lessons and bonus videos will appear here.
          </EmptyState>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {freeLessons.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => play(l.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-forest-100 p-3 text-left transition hover:bg-forest-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-700 text-spark-400">
                    <PlayIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-forest-950">{l.title}</span>
                    <span className="block text-xs text-slate-500">{modules[l.module].title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="assignments">
        <CardTitle title="Assignments" action={<span className="text-sm text-slate-500">{submitted.length}/{assignments.length} submitted</span>} />
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {assignments.map((a) => (
            <AssignmentItem key={a.id} user={user} slug={slug} a={a} progress={progress} />
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card id="interviews">
          <CardTitle title="Mock interviews" />
          {progress.interviews.length > 0 && (
            <ul className="mt-5 space-y-2">
              {progress.interviews.map((iv, i) => (
                <li key={i} className="rounded-2xl border border-forest-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-forest-950">{iv.topic}</p>
                    <span className="rounded-full bg-spark-500/25 px-2.5 py-0.5 text-xs font-bold text-forest-800">{iv.score}/10</span>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(iv.date)}</p>
                  {iv.feedback && <p className="mt-1 text-sm text-slate-600">{iv.feedback}</p>}
                </li>
              ))}
            </ul>
          )}
          {progress.interviewRequest ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-forest-950">Mock interview requested</p>
              <p className="mt-1">
                {progress.interviewRequest.topic} · preferred {formatDate(progress.interviewRequest.preferredDate)}. Your mentor will confirm the time.
              </p>
              <button
                type="button"
                onClick={() => cancelMockInterviewRequest(user.uid, slug).catch(() => {})}
                className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Cancel request
              </button>
            </div>
          ) : (
            <>
              {progress.interviews.length === 0 && (
                <p className="mt-3 text-sm text-slate-600">Practise with your mentor before real interviews. You&apos;ll get a score and feedback after each one.</p>
              )}
              <InterviewRequestForm user={user} slug={slug} />
            </>
          )}
        </Card>

        <Card id="attendance">
          <CardTitle title="Attendance" action={attendancePct !== null && <span className="text-sm font-semibold text-forest-700">{attendancePct}%</span>} />
          {progress.attendance.length === 0 ? (
            <EmptyState icon={CalendarIcon} title="No live sessions recorded yet">
              Your attendance is recorded after each live session.
            </EmptyState>
          ) : (
            <>
              <div className="mt-4">
                <ProgressBar value={attendancePct ?? 0} />
              </div>
              <ul className="mt-4 divide-y divide-forest-100">
                {[...progress.attendance].reverse().map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium text-forest-950">{a.title}</span>
                      <span className="block text-xs text-slate-500">{formatDate(a.date)}</span>
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.present ? "bg-spark-500/25 text-forest-800" : "bg-red-100 text-red-700"}`}>
                      {a.present ? "Present" : "Absent"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card id="performance">
        <CardTitle title="Performance report" action={<span className="text-sm font-semibold text-forest-700">Overall {overall}%</span>} />
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.map((r) => (
            <li key={r.label} className="rounded-2xl border border-forest-100 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-forest-950">{r.label}</p>
                <p className="text-lg font-bold text-forest-700">{r.value === null ? "—" : `${r.value}%`}</p>
              </div>
              <div className="mt-2">
                <ProgressBar value={r.value ?? 0} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{r.text}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card id="documents">
          <CardTitle title="Documents preparation" action={<span className="text-sm text-slate-500">{docsReady.length}/{documents.length} ready</span>} />
          <p className="mt-2 text-sm text-slate-600">Get these ready before you start applying. Tick each one off when it&apos;s done.</p>
          <ul className="mt-4 space-y-2">
            {documents.map((d) => {
              const ready = progress.docs.includes(d);
              return (
                <li key={d}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-forest-100 px-4 py-3 text-sm transition hover:bg-forest-50">
                    <input
                      type="checkbox"
                      checked={ready}
                      onChange={() => setDocumentReady(user.uid, slug, d, !ready).catch(() => {})}
                      className="h-4 w-4 accent-forest-700"
                    />
                    <span className={ready ? "text-slate-400 line-through" : "text-forest-950"}>{d}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card id="certificate">
          <CardTitle title="Certificate" />
          {certificateReady ? (
            <div className="mt-5 rounded-2xl border-4 border-forest-700 p-6 text-center outline outline-2 -outline-offset-[14px] outline-spark-500">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-forest-700">Certificate of completion</p>
              <p className="mt-4 text-sm text-slate-500">Awarded to</p>
              <p className="text-2xl font-bold text-forest-950">{user.name}</p>
              <p className="mt-2 text-sm text-slate-500">for completing</p>
              <p className="font-semibold text-forest-800">{course.title}</p>
              <button
                type="button"
                onClick={() => printCertificate(user.name, course, user.memberId)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-600"
              >
                <GraduationIcon className="h-4 w-4" /> Download certificate
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-forest-200 px-4 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                <LockIcon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-forest-950">Unlocks when you finish the course</p>
              <ul className="mt-3 space-y-1 text-left text-sm">
                <li className={coursePct === 100 ? "text-forest-700" : "text-slate-500"}>
                  {coursePct === 100 ? "✓" : "○"} Complete all lessons ({done.length}/{lessons.length})
                </li>
                <li className={submitted.length === assignments.length ? "text-forest-700" : "text-slate-500"}>
                  {submitted.length === assignments.length ? "✓" : "○"} Submit all assignments ({submitted.length}/{assignments.length})
                </li>
              </ul>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/** The learning space for one enrolled course: lessons, videos, assignments and career prep. */
export default function CourseView({ slug }: { slug: string }) {
  const course = useCourse(slug);
  const loaded = useCatalogLoaded();
  return (
    <DashboardShell role="student" sections={sections} sidebarCard={sidebarCard}>
      {(user) =>
        !course && !loaded ? (
          <div className="flex justify-center py-20">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" aria-label="Loading" />
          </div>
        ) : !course ? (
          <Card>
            <EmptyState icon={BookIcon} title="Course not found">
              <Link href="/dashboard#my-courses" className="font-semibold text-forest-700">
                Back to my courses
              </Link>
            </EmptyState>
          </Card>
        ) : user.enrolledCourses.includes(course.slug) ? (
          <CourseContent user={user} course={course} />
        ) : (
          <Card>
            <div className="flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:text-left">
              <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-2xl">
                <Image src={course.image} alt="" fill sizes="160px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="flex items-center justify-center gap-2 font-semibold text-forest-950 sm:justify-start">
                  <LockIcon className="h-4 w-4" /> {course.title} is locked
                </p>
                <p className="mt-1 text-sm text-slate-600">Enroll and get your payment approved to open the lessons, assignments and certificate.</p>
              </div>
              <Link
                href={courseHref(course.slug)}
                className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-600"
              >
                View course <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        )
      }
    </DashboardShell>
  );
}
