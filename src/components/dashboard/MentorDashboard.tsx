"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { BookIcon, BriefcaseIcon, CalendarIcon, ClockIcon, CloseIcon, GridIcon, PlayIcon, UsersIcon, WalletIcon } from "../icons";
import AvatarPicker from "../AvatarPicker";
import DashboardShell, { type Section } from "./DashboardShell";
import ProfilePhotoCard from "./ProfilePhotoCard";
import { Card, CardTitle, EmptyState, StatTiles, WelcomeBanner } from "./ui";
import { greetingName, type AppUser } from "@/lib/auth";
import {
  addRecording,
  addSession,
  byTopic,
  courseCategories,
  courseEarnings,
  courseImage,
  courseLevels,
  coursePath,
  createCourse,
  deleteCourse,
  deleteRecording,
  deleteSession,
  enrollmentStatusLabel,
  localDate,
  meetLinkPattern,
  rupee,
  sessionWhen,
  updateCourse,
  useMentorCourses,
  useMentorEnrollments,
  useRecordings,
  useUpcomingSessions,
  youtubeId,
  type Course,
  type CourseCategory,
  type CourseInput,
  type CourseLevel,
  type Enrollment,
} from "@/lib/courses";
import { getMentorPayout, getMentorProfile, payoutPatterns, saveMentorPayout, saveMentorProfile } from "@/lib/mentors";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "sessions", label: "Live Sessions", icon: CalendarIcon },
  { id: "my-courses", label: "My Courses", icon: BookIcon },
  { id: "recordings", label: "Recordings", icon: PlayIcon },
  { id: "earnings", label: "Earnings", icon: WalletIcon },
  { id: "students", label: "Students", icon: UsersIcon },
  { id: "photo", label: "Profile", icon: BriefcaseIcon },
];

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

const input =
  "w-full rounded-xl border border-forest-100 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-forest-400";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-60";

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-forest-900">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

type CourseFields = {
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  lessons: string;
  hours: string;
  price: string;
  oldPrice: string;
  imageUrl: string;
  outcomes: string;
  curriculum: string;
  mentorName: string;
  mentorDesignation: string;
  mentorPhoto: string;
};

/** A new course starts with the mentor's name and photo from their account. */
function fieldsFor(mentor: AppUser, course?: Course): CourseFields {
  return {
    mentorName: course?.mentorName ?? mentor.name,
    mentorDesignation: course?.mentorDesignation ?? "",
    mentorPhoto: course ? (course.mentorPhoto ?? "") : (mentor.photo ?? ""),
    title: course?.title ?? "",
    description: course?.description ?? "",
    category: course?.category ?? courseCategories[0],
    level: course?.level ?? courseLevels[0],
    lessons: course ? String(course.lessons) : "",
    hours: course ? String(course.hours) : "",
    price: course ? String(course.price) : "",
    oldPrice: course?.oldPrice ? String(course.oldPrice) : "",
    imageUrl: course?.imageUrl ?? "",
    outcomes: course?.outcomes.join("\n") ?? "",
    curriculum: course?.curriculum.join("\n") ?? "",
  };
}

/** Checks the form and converts it to what firestore.rules accepts, or returns an error message. */
function toCourseInput(f: CourseFields): CourseInput | string {
  const lessons = Number(f.lessons);
  const hours = Number(f.hours);
  const price = Number(f.price);
  const oldPrice = f.oldPrice.trim() ? Number(f.oldPrice) : undefined;
  if (f.mentorName.trim().length < 2) return "Enter the mentor name shown on the course.";
  if (f.mentorDesignation.trim().length < 2) return "Enter your designation, e.g. Software Engineer.";
  if (f.title.trim().length < 3) return "Give the course a title (at least 3 characters).";
  if (f.description.trim().length < 20) return "Describe the course in at least 20 characters.";
  if (!Number.isInteger(lessons) || lessons < 0) return "Lessons must be a whole number.";
  if (!Number.isFinite(hours) || hours < 0) return "Enter the hours of content.";
  if (!Number.isFinite(price) || price < 0) return "Enter a price (0 for a free course).";
  if (oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice < price)) return "The original price must be at least the selling price.";
  if (f.imageUrl.trim() && !/^https:\/\/.+/.test(f.imageUrl.trim())) return "The cover image must be an https:// link.";
  const outcomes = lines(f.outcomes);
  const curriculum = lines(f.curriculum);
  if (outcomes.length > 20) return "Keep it to 20 learning outcomes or fewer.";
  if (curriculum.length > 40) return "Keep it to 40 modules or fewer.";
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    category: f.category,
    level: f.level,
    lessons,
    hours,
    price,
    oldPrice,
    imageUrl: f.imageUrl.trim() || undefined,
    outcomes,
    curriculum,
    mentorName: f.mentorName.trim(),
    mentorDesignation: f.mentorDesignation.trim(),
    mentorPhoto: f.mentorPhoto || undefined,
  };
}

function CourseModal({ mentor, course, onClose }: { mentor: AppUser; course?: Course; onClose: () => void }) {
  const [f, setF] = useState<CourseFields>(() => fieldsFor(mentor, course));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof CourseFields>(k: K, v: CourseFields[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const result = toCourseInput(f);
    if (typeof result === "string") return setError(result);
    setSaving(true);
    setError("");
    try {
      if (course) await updateCourse(mentor, course, result);
      else await createCourse(mentor, result);
      onClose();
    } catch {
      setError("Couldn't save the course. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div data-lenis-prevent className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-forest-100 pb-4">
          <h3 className="text-lg font-bold text-forest-950">{course ? "Edit course" : "Post a new course"}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50 hover:text-slate-700"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <fieldset className="grid gap-4 rounded-2xl bg-forest-50/70 p-4 sm:col-span-2 sm:grid-cols-2">
            <legend className="sr-only">Mentor shown on this course</legend>
            <p className="text-sm font-semibold text-forest-950 sm:col-span-2">Your mentor details on this course</p>
            <Field label="Mentor name">
              <input className={input} value={f.mentorName} onChange={(e) => set("mentorName", e.target.value)} maxLength={100} />
            </Field>
            <Field label="Designation">
              <input
                className={input}
                value={f.mentorDesignation}
                onChange={(e) => set("mentorDesignation", e.target.value)}
                maxLength={80}
                placeholder="e.g. Software Engineer"
              />
            </Field>
            <div className="sm:col-span-2">
              <AvatarPicker value={f.mentorPhoto} onChange={(photo) => set("mentorPhoto", photo)} />
            </div>
          </fieldset>
          <Field label="Course title" className="sm:col-span-2">
            <input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="e.g. UI/UX Design Masterclass" />
          </Field>
          <Field label="Category">
            <select className={input} value={f.category} onChange={(e) => set("category", e.target.value as CourseCategory)}>
              {courseCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Level">
            <select className={input} value={f.level} onChange={(e) => set("level", e.target.value as CourseLevel)}>
              {courseLevels.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              className={`${input} min-h-28`}
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={3000}
              placeholder="What the course covers and who it's for"
            />
          </Field>
          <Field label="Lessons">
            <input className={input} type="number" min={0} step={1} value={f.lessons} onChange={(e) => set("lessons", e.target.value)} />
          </Field>
          <Field label="Hours of content">
            <input className={input} type="number" min={0} step="any" value={f.hours} onChange={(e) => set("hours", e.target.value)} />
          </Field>
          <Field label="Price (₹)" hint="0 for a free course">
            <input className={input} type="number" min={0} step="any" value={f.price} onChange={(e) => set("price", e.target.value)} />
          </Field>
          <Field label="Original price (₹, optional)" hint="Shown struck through as a discount">
            <input className={input} type="number" min={0} step="any" value={f.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} />
          </Field>
          <Field label="Cover image link (optional)" hint="An https:// image link. Leave empty to use the category image." className="sm:col-span-2">
            <input className={input} type="url" value={f.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="What students will learn (optional)" hint="One outcome per line" className="sm:col-span-2">
            <textarea className={`${input} min-h-24`} value={f.outcomes} onChange={(e) => set("outcomes", e.target.value)} />
          </Field>
          <Field label="Curriculum (optional)" hint="One module per line" className="sm:col-span-2">
            <textarea className={`${input} min-h-24`} value={f.curriculum} onChange={(e) => set("curriculum", e.target.value)} />
          </Field>

          {error && <p className="text-sm font-medium text-red-600 sm:col-span-2">{error}</p>}

          <div className="flex gap-2.5 pt-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-forest-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-forest-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`flex-1 ${primaryButton}`}>
              {saving ? "Saving…" : course ? "Save changes" : "Post course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SessionsCard({ mentor, courses }: { mentor: AppUser; courses: Course[] | null }) {
  const { sessions, loaded } = useUpcomingSessions((courses ?? []).map((c) => c.id));
  const [courseId, setCourseId] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(localDate);
  const [time, setTime] = useState("18:00");
  const [meetLink, setMeetLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const selected = courses?.find((c) => c.id === courseId) ?? courses?.[0];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!selected) return;
    if (topic.trim().length < 2) return setMessage({ ok: false, text: "Add a topic for the session." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < localDate()) return setMessage({ ok: false, text: "Pick today or a later date." });
    if (!/^\d{2}:\d{2}$/.test(time)) return setMessage({ ok: false, text: "Pick a start time." });
    if (!meetLinkPattern.test(meetLink.trim()))
      return setMessage({ ok: false, text: "Paste a Google Meet link, like https://meet.google.com/abc-defg-hij" });
    setSaving(true);
    try {
      await addSession(mentor, selected, { topic: topic.trim(), date, time, meetLink: meetLink.trim() });
      setTopic("");
      setMeetLink("");
      setMessage({ ok: true, text: `Posted. Students enrolled in ${selected.title} can see the link now.` });
    } catch {
      setMessage({ ok: false, text: "Couldn't post the session. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: (typeof sessions)[number]) => {
    if (!window.confirm(`Remove "${s.topic}" on ${sessionWhen(s)}? Students will no longer see this link.`)) return;
    try {
      await deleteSession(s);
    } catch {
      setMessage({ ok: false, text: "Couldn't remove that session." });
    }
  };

  return (
    <Card id="sessions">
      <CardTitle title="Today's live session links" />
      {courses !== null && courses.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="Post a course first">
          Once you have a course, you can share a Google Meet link for each day&apos;s session here.
        </EmptyState>
      ) : (
        <>
          <form onSubmit={submit} className="mt-5 grid gap-4 rounded-2xl bg-forest-50/70 p-4 sm:grid-cols-2 lg:grid-cols-6">
            <Field label="Course" className="lg:col-span-2">
              <select className={input} value={selected?.id ?? ""} onChange={(e) => setCourseId(e.target.value)}>
                {(courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Topic" className="lg:col-span-2">
              <input className={input} value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={160} placeholder="e.g. Doubt clearing: React hooks" />
            </Field>
            <Field label="Date">
              <input className={input} type="date" min={localDate()} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Start time">
              <input className={input} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Google Meet link" className="sm:col-span-2 lg:col-span-4">
              <input
                className={input}
                type="url"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
              />
            </Field>
            <div className="flex items-end sm:col-span-2">
              <button type="submit" disabled={saving || !selected} className={`w-full ${primaryButton}`}>
                {saving ? "Posting…" : "Post session link"}
              </button>
            </div>
            {message && (
              <p className={`text-sm font-medium sm:col-span-2 lg:col-span-6 ${message.ok ? "text-forest-700" : "text-red-600"}`}>{message.text}</p>
            )}
          </form>

          <h3 className="mt-6 text-sm font-semibold text-forest-950">Upcoming sessions</h3>
          {!loaded || courses === null ? (
            <p className="mt-3 text-sm text-slate-500">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No sessions posted for today or later.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-forest-100 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-forest-950">{s.topic}</p>
                    <p className="text-sm text-slate-500">
                      {s.courseTitle} · <span className="font-medium text-forest-700">{sessionWhen(s)}</span>
                    </p>
                    <a href={s.meetLink} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-xs text-forest-600 hover:underline">
                      {s.meetLink}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

/** Post YouTube recordings of classes under a topic; approved students watch them in their dashboard. */
function RecordingsCard({ mentor, courses }: { mentor: AppUser; courses: Course[] | null }) {
  const [courseId, setCourseId] = useState("");
  const selected = courses?.find((c) => c.id === courseId) ?? courses?.[0];
  const recordings = useRecordings(selected?.id ?? null);
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const topics = byTopic(recordings ?? []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!selected) return;
    const videoId = youtubeId(link);
    if (topic.trim().length < 2) return setMessage({ ok: false, text: "Enter the topic this recording belongs to." });
    if (title.trim().length < 2) return setMessage({ ok: false, text: "Give the recording a title." });
    if (!videoId) return setMessage({ ok: false, text: "Paste a YouTube video link, like https://youtu.be/abc123XYZ_0" });
    setSaving(true);
    try {
      await addRecording(mentor, selected.id, { topic: topic.trim(), title: title.trim(), videoId });
      setTitle("");
      setLink("");
      setMessage({ ok: true, text: "Recording added. Students with access can watch it now." });
    } catch {
      setMessage({ ok: false, text: "Couldn't add the recording. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!selected || !window.confirm(`Remove the recording "${name}"?`)) return;
    try {
      await deleteRecording(selected.id, id);
    } catch {
      setMessage({ ok: false, text: "Couldn't remove that recording." });
    }
  };

  return (
    <Card id="recordings">
      <CardTitle title="Recorded classes" />
      <p className="mt-1 text-sm text-slate-500">
        Upload the class to YouTube (as <strong>Unlisted</strong>, so it doesn&apos;t appear in YouTube search), then paste the link
        here under its topic. Only students whose payment is verified can watch it.
      </p>
      {courses !== null && courses.length === 0 ? (
        <EmptyState icon={PlayIcon} title="Post a course first" />
      ) : (
        <>
          <form onSubmit={submit} className="mt-5 grid gap-4 rounded-2xl bg-forest-50/70 p-4 sm:grid-cols-2">
            <Field label="Course">
              <select className={input} value={selected?.id ?? ""} onChange={(e) => setCourseId(e.target.value)}>
                {(courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Topic" hint="Pick an existing topic or type a new one">
              <input
                className={input}
                list="recording-topics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={120}
                placeholder="e.g. Module 1: HTML basics"
              />
              <datalist id="recording-topics">
                {topics.map((t) => (
                  <option key={t.topic} value={t.topic} />
                ))}
              </datalist>
            </Field>
            <Field label="Video title">
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="e.g. Class 3: Forms and inputs" />
            </Field>
            <Field label="YouTube link">
              <input className={input} type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtu.be/…" />
            </Field>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving || !selected} className={primaryButton}>
                {saving ? "Adding…" : "Add recording"}
              </button>
            </div>
            {message && <p className={`text-sm font-medium sm:col-span-2 ${message.ok ? "text-forest-700" : "text-red-600"}`}>{message.text}</p>}
          </form>

          {recordings === null ? (
            <p className="mt-6 text-sm text-slate-500">Loading recordings…</p>
          ) : topics.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No recordings for this course yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {topics.map((t) => (
                <div key={t.topic}>
                  <h3 className="text-sm font-semibold text-forest-950">{t.topic}</h3>
                  <ul className="mt-2 divide-y divide-forest-100 rounded-2xl border border-forest-100">
                    {t.recordings.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <PlayIcon className="h-4 w-4 shrink-0 text-forest-600" />
                        <a
                          href={`https://youtu.be/${r.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 truncate text-sm text-forest-900 hover:underline"
                        >
                          {r.title}
                        </a>
                        <button type="button" onClick={() => remove(r.id, r.title)} className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function CoursesCard({ mentor, courses }: { mentor: AppUser; courses: Course[] | null }) {
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [error, setError] = useState("");

  const remove = async (c: Course) => {
    if (!window.confirm(`Delete "${c.title}"? Its live sessions are removed too and it disappears from the catalog.`)) return;
    setError("");
    try {
      await deleteCourse(c.id);
    } catch {
      setError("Couldn't delete that course.");
    }
  };

  return (
    <Card id="my-courses">
      <CardTitle
        title="My courses"
        action={
          <button type="button" onClick={() => setEditing("new")} className={`${primaryButton} !px-4 !py-1.5 text-xs`}>
            + Post a course
          </button>
        }
      />
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {courses === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading courses…</p>
      ) : courses.length === 0 ? (
        <EmptyState icon={BookIcon} title="You haven't posted a course yet">
          Post your first course and it appears in the public catalog straight away.
        </EmptyState>
      ) : (
        <div className="mt-5 space-y-4">
          {courses.map((c) => (
            <article key={c.id} className="flex flex-col gap-4 rounded-2xl border border-forest-100 p-3 sm:flex-row sm:items-center">
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
                <Image src={courseImage(c)} alt={c.title} fill sizes="(min-width: 640px) 160px, 100vw" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1 px-1 sm:px-0">
                <h3 className="font-semibold leading-snug text-forest-950">{c.title}</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {c.category} · {c.level} · {c.lessons} lessons · {c.hours} hrs · {c.price ? rupee.format(c.price) : "Free"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={coursePath(c.id)} className="rounded-full border border-forest-200 px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50">
                  View
                </Link>
                <button type="button" onClick={() => setEditing(c)} className="rounded-full border border-forest-200 px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50">
                  Edit
                </button>
                <button type="button" onClick={() => remove(c)} className="rounded-full px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <CourseModal mentor={mentor} course={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function StudentsCard({ enrollments }: { enrollments: Enrollment[] | null }) {
  return (
    <Card id="students">
      <CardTitle title="Enrolled students" />
      {enrollments === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading students…</p>
      ) : enrollments.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No students enrolled yet" />
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Student</th>
                <th className="pb-3 font-semibold">Course</th>
                <th className="pb-3 font-semibold">Access</th>
                <th className="pb-3 font-semibold">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-forest-950">{e.studentName}</span>
                    <span className="block text-xs text-slate-500">
                      {e.studentMemberId && <span className="font-mono font-semibold text-forest-700">{e.studentMemberId} · </span>}
                      {e.studentEmail}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{e.courseTitle}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${e.status === "approved" ? "bg-forest-100 text-forest-800" : "bg-spark-500/25 text-forest-800"}`}>
                      {enrollmentStatusLabel[e.status]}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">{e.createdAt ? dateFormat.format(e.createdAt.toDate()) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function EarningsCard({ courses, enrollments }: { courses: Course[] | null; enrollments: Enrollment[] | null }) {
  const rows = courses && enrollments ? courseEarnings(courses, enrollments) : null;
  const total = rows?.reduce((s, r) => s + r.earned, 0) ?? 0;
  const pending = rows?.reduce((s, r) => s + r.pendingAmount, 0) ?? 0;

  return (
    <Card id="earnings">
      <CardTitle title="Earnings" />
      <p className="mt-1 text-sm text-slate-500">
        Course price × students whose payment the admin has verified. Payments still under review are shown separately.
      </p>
      {rows === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading earnings…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={WalletIcon} title="No courses yet">
          Post a course to start earning.
        </EmptyState>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-forest-700 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-spark-400">Total earned</p>
              <p className="mt-1 text-3xl font-bold text-white">{rupee.format(total)}</p>
            </div>
            <div className="rounded-2xl border border-forest-100 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting verification</p>
              <p className="mt-1 text-3xl font-bold text-forest-950">{rupee.format(pending)}</p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Course</th>
                  <th className="pb-3 font-semibold">Price</th>
                  <th className="pb-3 font-semibold">Paid students</th>
                  <th className="pb-3 font-semibold">Pending</th>
                  <th className="pb-3 text-right font-semibold">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {rows.map((r) => (
                  <tr key={r.courseId}>
                    <td className="py-3 pr-4 font-semibold text-forest-950">{r.title}</td>
                    <td className="py-3 pr-4 text-slate-600">{r.price ? rupee.format(r.price) : "Free"}</td>
                    <td className="py-3 pr-4 text-slate-600">{r.paidStudents}</td>
                    <td className="py-3 pr-4 text-slate-500">{r.pendingStudents}</td>
                    <td className="py-3 text-right font-bold text-forest-700">{rupee.format(r.earned)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-forest-100">
                  <td colSpan={4} className="pt-3 font-semibold text-forest-950">
                    Total
                  </td>
                  <td className="pt-3 text-right font-bold text-forest-700">{rupee.format(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

/** Bank account and UPI for receiving payouts. Private: only this mentor and admins can see it. */
function PayoutCard({ mentor }: { mentor: AppUser }) {
  const empty = { accountHolder: "", bankName: "", accountNumber: "", ifsc: "", upiId: "", upiNumber: "" };
  const [form, setForm] = useState(empty);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    getMentorPayout(mentor.uid)
      .then((p) => {
        if (p) setForm({ accountHolder: p.accountHolder, bankName: p.bankName, accountNumber: p.accountNumber, ifsc: p.ifsc, upiId: p.upiId, upiNumber: p.upiNumber });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [mentor.uid]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const p = {
      accountHolder: form.accountHolder.trim(),
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.replace(/\s/g, ""),
      ifsc: form.ifsc.trim().toUpperCase(),
      upiId: form.upiId.trim(),
      upiNumber: form.upiNumber.replace(/[\s-]/g, "").replace(/^(\+?91)(?=\d{10}$)/, ""),
    };
    const hasBank = p.accountNumber || p.ifsc || p.bankName;
    if (hasBank && !(p.accountHolder && p.bankName && p.accountNumber && p.ifsc))
      return setMessage({ ok: false, text: "For bank transfer, fill in the account holder, bank name, account number and IFSC." });
    if (p.accountNumber && !payoutPatterns.accountNumber.test(p.accountNumber)) return setMessage({ ok: false, text: "The account number should be 6–20 digits." });
    if (p.ifsc && !payoutPatterns.ifsc.test(p.ifsc)) return setMessage({ ok: false, text: "Enter a valid IFSC code, e.g. SBIN0001234." });
    if (p.upiId && !payoutPatterns.upiId.test(p.upiId)) return setMessage({ ok: false, text: "Enter a valid UPI ID, e.g. name@okaxis." });
    if (p.upiNumber && !payoutPatterns.upiNumber.test(p.upiNumber)) return setMessage({ ok: false, text: "Enter a valid 10-digit UPI mobile number." });
    if (!hasBank && !p.upiId && !p.upiNumber) return setMessage({ ok: false, text: "Add bank details or a UPI ID / number so we can pay you." });
    setSaving(true);
    try {
      await saveMentorPayout(mentor.uid, p);
      setForm(p);
      setMessage({ ok: true, text: "Payout details saved. Only you and the Nuels admin team can see them." });
    } catch {
      setMessage({ ok: false, text: "Couldn't save your payout details. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="payouts">
      <CardTitle title="Bank & UPI details" />
      <p className="mt-1 text-sm text-slate-500">Where we send your earnings. Private: never shown on the website or to students.</p>
      {!loaded ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Account holder name">
            <input className={input} value={form.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} maxLength={100} autoComplete="name" />
          </Field>
          <Field label="Bank name">
            <input className={input} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} maxLength={100} placeholder="e.g. State Bank of India" />
          </Field>
          <Field label="Account number">
            <input className={input} inputMode="numeric" value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} maxLength={24} autoComplete="off" />
          </Field>
          <Field label="IFSC code">
            <input className={`${input} uppercase`} value={form.ifsc} onChange={(e) => set("ifsc", e.target.value)} maxLength={11} placeholder="e.g. SBIN0001234" autoComplete="off" />
          </Field>
          <Field label="UPI ID">
            <input className={input} value={form.upiId} onChange={(e) => set("upiId", e.target.value)} maxLength={320} placeholder="e.g. name@okaxis" autoComplete="off" />
          </Field>
          <Field label="UPI mobile number">
            <input className={input} type="tel" value={form.upiNumber} onChange={(e) => set("upiNumber", e.target.value)} maxLength={16} placeholder="98765 43210" />
          </Field>
          {message && <p className={`text-sm font-medium sm:col-span-2 ${message.ok ? "text-forest-700" : "text-red-600"}`}>{message.text}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Saving…" : "Save payout details"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function ProfileCard({ mentor }: { mentor: AppUser }) {
  const [form, setForm] = useState({ headline: "", experience: "", company: "", bio: "", linkedin: "" });
  const [loaded, setLoaded] = useState(false);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    getMentorProfile(mentor.uid)
      .then((p) => {
        if (p) {
          setForm({ headline: p.headline, experience: p.experience, company: p.company, bio: p.bio, linkedin: p.linkedin ?? "" });
          setPublished(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [mentor.uid]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (form.headline.trim().length < 2) return setMessage({ ok: false, text: "Add a headline, e.g. “UI/UX Design Mentor”." });
    if (form.linkedin.trim() && !/^https:\/\/([a-z]+\.)?linkedin\.com\/.*/.test(form.linkedin.trim()))
      return setMessage({ ok: false, text: "The LinkedIn link should start with https://www.linkedin.com/" });
    setSaving(true);
    try {
      await saveMentorProfile(mentor, {
        headline: form.headline.trim(),
        experience: form.experience.trim(),
        company: form.company.trim(),
        bio: form.bio.trim(),
        linkedin: form.linkedin.trim() || undefined,
      });
      setPublished(true);
      setMessage({ ok: true, text: "Saved. Your card is live on the Mentors page." });
    } catch {
      setMessage({ ok: false, text: "Couldn't save your profile. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="profile">
      <CardTitle title="Public mentor profile" />
      <p className="mt-1 text-sm text-slate-500">
        {published ? "Shown on the Mentors page and your course pages." : "Not published yet. Fill this in to appear on the Mentors page."} Your name and
        photo come from your account; your phone and email are never shown.
      </p>
      {!loaded ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Headline">
            <input className={input} value={form.headline} onChange={(e) => set("headline", e.target.value)} maxLength={120} placeholder="e.g. Full-Stack & Data Mentor" />
          </Field>
          <Field label="Experience">
            <input className={input} value={form.experience} onChange={(e) => set("experience", e.target.value)} maxLength={40} placeholder="e.g. 10+ yrs" />
          </Field>
          <Field label="Current or past company / role">
            <input className={input} value={form.company} onChange={(e) => set("company", e.target.value)} maxLength={120} placeholder="e.g. Design Lead, SaaS products" />
          </Field>
          <Field label="LinkedIn (optional)">
            <input className={input} type="url" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://www.linkedin.com/in/…" />
          </Field>
          <Field label="Short bio" className="sm:col-span-2">
            <textarea className={`${input} min-h-24`} value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={1500} />
          </Field>
          {message && <p className={`text-sm font-medium sm:col-span-2 ${message.ok ? "text-forest-700" : "text-red-600"}`}>{message.text}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? "Saving…" : published ? "Update profile" : "Publish profile"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function MentorContent({ user }: { user: AppUser }) {
  const courses = useMentorCourses(user.uid);
  const enrollments = useMentorEnrollments(user.uid);
  const stats = [
    { label: "Courses you teach", value: courses?.length ?? "—", icon: BookIcon },
    { label: "Active students", value: enrollments?.filter((e) => e.status === "approved").length ?? "—", icon: UsersIcon },
    {
      label: "Total earned",
      value: courses && enrollments ? rupee.format(courseEarnings(courses, enrollments).reduce((s, r) => s + r.earned, 0)) : "—",
      icon: WalletIcon,
    },
    { label: "Hours of content", value: courses?.reduce((s, c) => s + c.hours, 0) ?? "—", icon: ClockIcon },
  ];

  return (
    <>
      <WelcomeBanner id="overview" title={<>Welcome, {greetingName(user)}!</>}>
        <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
          Post your courses, share each day&apos;s Google Meet link, add your YouTube class recordings by topic, and keep your public
          profile up to date.
        </p>
      </WelcomeBanner>

      <StatTiles stats={stats} />

      <SessionsCard mentor={user} courses={courses} />
      <CoursesCard mentor={user} courses={courses} />
      <RecordingsCard mentor={user} courses={courses} />
      <EarningsCard courses={courses} enrollments={enrollments} />
      <StudentsCard enrollments={enrollments} />
      <ProfilePhotoCard user={user} />
      <ProfileCard mentor={user} />
      <PayoutCard mentor={user} />
    </>
  );
}

export default function MentorDashboard() {
  return (
    <DashboardShell role="mentor" sections={sections}>
      {(user) => <MentorContent user={user} />}
    </DashboardShell>
  );
}
