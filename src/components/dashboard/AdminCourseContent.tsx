"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarIcon, CheckIcon, CopyIcon, PlayIcon, UsersIcon } from "../icons";
import { CourseEditor } from "./AdminCourses";
import { Card, CardTitle, EmptyState, SearchBox, matchesSearch } from "./ui";
import { sessionWhen, useNow } from "../learn/LiveSessions";
import { modulesFor, type Lesson, type Module } from "@/data/learning";
import { mentors } from "@/data/site";
import { courseTitle, syllabusFor, useCatalog, type CatalogCourse } from "@/lib/catalog";
import {
  deleteLiveSession,
  isLiveClassLink,
  isVideoLink,
  saveLessonMeet,
  saveLessonVideo,
  saveLiveSessions,
  sessionPhase,
  useCourseVideos,
  useLiveSessions,
  type CourseSession,
  type LiveSession,
} from "@/lib/learning";

const input =
  "w-full rounded-2xl border border-forest-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";
const smallBtn = "rounded-full bg-forest-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-forest-600 disabled:opacity-50";
const ghostBtn = "rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold text-forest-700 transition hover:bg-forest-50 disabled:opacity-50";
const fieldLabel = "mb-1 block text-xs font-semibold text-forest-900";

const PICK_KEY = "nuels.contentCourse";

/** Opens the Course videos page on one course (used by the Courses table). */
export function openCourseContent(slug: string) {
  try {
    sessionStorage.setItem(PICK_KEY, slug);
  } catch {
    /* private mode: the page opens on the first course */
  }
  window.location.hash = "course-content";
}

type Videos = NonNullable<ReturnType<typeof useCourseVideos>>;

/* ------------------------------------------------------------------ topics & videos */

function LessonVideoRow({ slug, lesson, url: savedUrl, free: savedFree, meet: savedMeet }: { slug: string; lesson: Lesson; url: string; free: boolean; meet: string }) {
  const [url, setUrl] = useState(savedUrl);
  const [free, setFree] = useState(savedFree);
  const [meet, setMeet] = useState(savedMeet);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error" | "badMeet" | "badVideo">("idle");
  const videoDirty = url.trim() !== savedUrl || free !== savedFree;
  const meetDirty = meet.trim() !== savedMeet;
  const dirty = videoDirty || meetDirty;

  useEffect(() => {
    setUrl(savedUrl);
    setFree(savedFree);
    setMeet(savedMeet);
  }, [savedUrl, savedFree, savedMeet]);

  const save = async () => {
    if (url.trim() && !isVideoLink(url)) return setState("badVideo");
    if (meet.trim() && !isLiveClassLink(meet)) return setState("badMeet");
    setState("saving");
    try {
      await Promise.all([videoDirty ? saveLessonVideo(slug, lesson.id, url, free) : null, meetDirty ? saveLessonMeet(slug, lesson.id, meet) : null]);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  const edit = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setState("idle");
  };

  return (
    <li className="py-2.5">
      <div className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${savedUrl ? "bg-forest-600" : "bg-slate-300"}`}
            title={savedUrl ? "Video added" : "No video yet"}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-sm text-forest-950">{lesson.title}</span>
            {savedUrl && (
              <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-forest-600 hover:text-forest-500">
                Open video ↗
              </a>
            )}
          </span>
        </div>
        <input
          value={url}
          onChange={edit(setUrl)}
          placeholder="YouTube, Vimeo, Google Drive or .mp4 link"
          aria-label={`Video link for ${lesson.title}`}
          className={`${input} ${state === "badVideo" ? "border-red-300" : ""}`}
        />
        <input
          value={meet}
          onChange={edit(setMeet)}
          placeholder="Google Meet link (optional)"
          aria-label={`Live class link for ${lesson.title}`}
          className={`${input} ${state === "badMeet" ? "border-red-300" : ""}`}
        />
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600" title="Free preview: anyone signed in can watch it">
          <input type="checkbox" checked={free} onChange={(e) => (setFree(e.target.checked), setState("idle"))} className="h-4 w-4 accent-forest-700" /> Free
        </label>
        <button type="button" onClick={save} disabled={!dirty || state === "saving"} className={smallBtn}>
          {state === "saving" ? "Saving…" : state === "saved" && !dirty ? "Saved" : state === "error" ? "Retry" : "Save"}
        </button>
      </div>
      {state === "badVideo" && <p className="mt-1 text-xs font-medium text-red-600">Use a YouTube, Vimeo or Google Drive file link (https://…), or a direct .mp4 link.</p>}
      {state === "badMeet" && <p className="mt-1 text-xs font-medium text-red-600">Use a Google Meet, Zoom or Microsoft Teams link (https://…).</p>}
      {state === "error" && <p className="mt-1 text-xs font-medium text-red-600">Couldn&apos;t save. Check your connection and try again.</p>}
    </li>
  );
}

/** One Meet link for every topic in a module (a batch usually meets on the same link). */
function ModuleMeetForm({ slug, module }: { slug: string; module: Module }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState("");
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs font-semibold text-forest-700 hover:text-forest-500">
        + Use one Meet link for every topic in this module
      </button>
    );
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLiveClassLink(link)) return setMsg("Use a Google Meet, Zoom or Teams link (https://…).");
    if (!window.confirm(`Set this link on all ${module.lessons.length} topics of "${module.title}"? It replaces their current Meet links.`)) return;
    setMsg("Saving…");
    try {
      await Promise.all(module.lessons.map((l) => saveLessonMeet(slug, l.id, link)));
      setMsg("Saved on every topic.");
      setLink("");
    } catch {
      setMsg("Couldn't save. Try again.");
    }
  };
  return (
    <form onSubmit={save} className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-forest-50/70 p-3">
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" aria-label={`Meet link for module ${module.title}`} className={`${input} sm:w-80`} />
      <button type="submit" className={smallBtn}>
        Apply to module
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500">
        Close
      </button>
      {msg && <span className="text-xs font-medium text-forest-700">{msg}</span>}
    </form>
  );
}

function TopicsTab({ slug, modules, videos }: { slug: string; modules: Module[]; videos: Videos }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | "missing" | "added">("all");
  const has = (id: string) => !!(videos.free[id] ?? videos.paid[id]);
  const shown = modules
    .map((m, i) => ({
      m,
      i,
      lessons: m.lessons.filter((l) => matchesSearch(query, l.title, m.title) && (show === "all" || (show === "missing") !== has(l.id))),
    }))
    .filter((x) => x.lessons.length);

  if (!modules.length)
    return (
      <EmptyState icon={PlayIcon} title="This course has no modules yet">
        Use “Edit modules &amp; topics” above to add modules and their topics, then attach a video to each topic here.
      </EmptyState>
    );

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search topics in this course" className="sm:w-80" />
        <div className="flex gap-1 rounded-full bg-forest-50 p-1 text-xs font-semibold" role="radiogroup" aria-label="Show topics">
          {(
            [
              ["all", "All topics"],
              ["missing", "Needs a video"],
              ["added", "Has a video"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={show === k}
              onClick={() => setShow(k)}
              className={`rounded-full px-3 py-1.5 transition ${show === k ? "bg-forest-700 text-white" : "text-forest-800 hover:bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 hidden text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] md:gap-2">
        <span>Topic</span>
        <span>Recorded video</span>
        <span>Live class link</span>
        <span>Preview</span>
        <span className="w-[62px]" />
      </p>
      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No topics match.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {shown.map(({ m, i, lessons }) => {
            const added = m.lessons.filter((l) => has(l.id)).length;
            return (
              <details key={`${slug}-${i}`} open className="group rounded-2xl border border-forest-100 px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="text-sm font-bold text-forest-950">
                    Module {i + 1} · {m.title}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${added === m.lessons.length ? "bg-spark-500/25 text-forest-800" : "bg-forest-50 text-forest-700"}`}>
                      {added}/{m.lessons.length} videos
                    </span>
                    <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>
                      ▾
                    </span>
                  </span>
                </summary>
                <ul className="mt-1 divide-y divide-forest-100">
                  {lessons.map((l) => (
                    <LessonVideoRow
                      key={`${slug}-${l.id}`}
                      slug={slug}
                      lesson={l}
                      url={videos.free[l.id] ?? videos.paid[l.id] ?? ""}
                      free={!!videos.free[l.id]}
                      meet={videos.meet[l.id] ?? ""}
                    />
                  ))}
                </ul>
                <ModuleMeetForm slug={slug} module={m} />
              </details>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ live classes */

type Repeat = "once" | "daily" | "monsat" | "weekly";
const repeatLabels: Record<Repeat, string> = { once: "Doesn't repeat", daily: "Every day", monsat: "Every day except Sunday", weekly: "Every week" };

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Start times of a series (skipping Sundays for Mon–Sat). */
function seriesStarts(first: Date, repeat: Repeat, count: number) {
  const out: number[] = [];
  const d = new Date(first);
  for (let guard = 0; out.length < (repeat === "once" ? 1 : count) && guard < 400; guard++) {
    if (repeat !== "monsat" || d.getDay() !== 0) out.push(d.getTime());
    d.setDate(d.getDate() + (repeat === "weekly" ? 7 : 1));
  }
  return out;
}

const shortDate = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

function ScheduleForm({
  slug,
  lessons,
  modules,
  editing,
  lastLink,
  onDone,
}: {
  slug: string;
  lessons: Lesson[];
  modules: Module[];
  editing: CourseSession | null;
  lastLink: string;
  onDone: () => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const blank = { lessonId: "", title: "", date: toDateInput(tomorrow), time: "18:00", minutes: "60", link: lastLink, note: "", repeat: "once" as Repeat, count: "6", advance: true };
  const fromSession = (s: CourseSession) => ({
    ...blank,
    lessonId: s.lessonId ?? "",
    title: s.title,
    date: toDateInput(new Date(s.startsAt)),
    time: toTimeInput(new Date(s.startsAt)),
    minutes: String(s.minutes),
    link: s.link,
    note: s.note ?? "",
  });
  const [f, setF] = useState(() => (editing ? fromSession(editing) : blank));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    setF(editing ? fromSession(editing) : { ...blank, link: lastLink });
    // Keep "Class updated." visible after leaving edit mode.
    if (editing) setMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, slug]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const lessonById = (id: string) => lessons.find((l) => l.id === id);
  const first = new Date(`${f.date}T${f.time || "00:00"}`);
  const repeat: Repeat = editing ? "once" : f.repeat;
  const count = Math.min(60, Math.max(2, Number(f.count) || 2));
  const starts = Number.isNaN(first.getTime()) ? [] : seriesStarts(first, repeat, count);
  const startIndex = lessons.findIndex((l) => l.id === f.lessonId);
  const advancing = repeat !== "once" && f.advance && startIndex >= 0;
  const plan = starts.map((at, i) => {
    const lesson = advancing ? lessons[startIndex + i] : lessonById(f.lessonId);
    const title = (advancing ? lesson?.title : f.title.trim() || lesson?.title) || f.title.trim() || "Live class";
    return { at, lesson, title };
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!starts.length) return setMsg("Pick a date and a start time.");
    if (!isLiveClassLink(f.link)) return setMsg("Paste the class link: Google Meet, Zoom or Teams (https://…).");
    if (!f.lessonId && !f.title.trim()) return setMsg("Choose a topic or type a title for the class.");
    if (!editing && starts[0] < Date.now()) return setMsg("That start time has already passed.");
    const minutes = Math.min(600, Math.max(10, Number(f.minutes) || 60));
    const stamp = Date.now().toString(36);
    const sessions: LiveSession[] = plan.map((p, i) => ({
      id: editing?.id ?? `s${stamp}${pad(i)}`,
      title: p.title,
      startsAt: p.at,
      minutes,
      link: f.link,
      lessonId: p.lesson?.id,
      note: f.note,
      recording: editing?.recording,
    }));
    setBusy(true);
    setMsg("");
    try {
      await saveLiveSessions(slug, sessions);
      setMsg(editing ? "Class updated." : sessions.length === 1 ? "Class scheduled. Enrolled students see it now." : `${sessions.length} classes scheduled. Enrolled students see them now.`);
      if (!editing) setF((x) => ({ ...blank, link: x.link }));
      onDone();
    } catch {
      setMsg("Couldn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-forest-100 bg-forest-50/50 p-4">
      <p className="text-sm font-bold text-forest-950">{editing ? `Edit class: ${editing.title}` : "Schedule a live class"}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className={fieldLabel}>Topic</span>
          <select value={f.lessonId} onChange={(e) => set("lessonId", e.target.value)} className={input} aria-label="Topic">
            <option value="">No specific topic</option>
            {modules.map((m, i) => (
              <optgroup key={i} label={`Module ${i + 1} · ${m.title}`}>
                {m.lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className={fieldLabel}>Title {f.lessonId && <span className="font-normal text-slate-400">(blank = topic name)</span>}</span>
          <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={lessonById(f.lessonId)?.title ?? "e.g. Doubt-clearing session"} className={input} />
        </label>
        <label>
          <span className={fieldLabel}>Date</span>
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={input} required />
        </label>
        <label>
          <span className={fieldLabel}>Starts at</span>
          <input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={input} required />
        </label>
        <label>
          <span className={fieldLabel}>Duration</span>
          <select value={f.minutes} onChange={(e) => set("minutes", e.target.value)} className={input}>
            {[30, 45, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? "s" : ""}`}
              </option>
            ))}
          </select>
        </label>
        {!editing && (
          <label>
            <span className={fieldLabel}>Repeat</span>
            <select value={f.repeat} onChange={(e) => set("repeat", e.target.value as Repeat)} className={input}>
              {(Object.keys(repeatLabels) as Repeat[]).map((r) => (
                <option key={r} value={r}>
                  {repeatLabels[r]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="sm:col-span-2">
          <span className={fieldLabel}>Google Meet link</span>
          <input value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" className={input} />
        </label>
        {repeat !== "once" && (
          <label>
            <span className={fieldLabel}>Number of classes</span>
            <input type="number" min={2} max={60} value={f.count} onChange={(e) => set("count", e.target.value)} className={input} />
          </label>
        )}
        {repeat !== "once" && f.lessonId && (
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium text-slate-700">
            <input type="checkbox" checked={f.advance} onChange={(e) => set("advance", e.target.checked)} className="h-4 w-4 accent-forest-700" />
            Next topic in each class
          </label>
        )}
        <label className="sm:col-span-2 lg:col-span-4">
          <span className={fieldLabel}>
            Note for students <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Keep Python installed before the class" className={input} />
        </label>
      </div>

      {plan.length > 1 && (
        <div className="mt-3 rounded-2xl bg-white p-3 text-xs text-slate-600">
          <p className="font-semibold text-forest-900">
            {plan.length} classes, {shortDate.format(plan[0].at)} to {shortDate.format(plan[plan.length - 1].at)}
          </p>
          <ul className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto">
            {plan.map((p, i) => (
              <li key={i}>
                {shortDate.format(p.at)} · {p.title}
              </li>
            ))}
          </ul>
          {advancing && startIndex + plan.length > lessons.length && (
            <p className="mt-1.5 font-medium text-amber-700">The topics run out after {lessons.length - startIndex} classes; the rest are named “{f.title.trim() || "Live class"}”.</p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={smallBtn}>
          {busy ? "Saving…" : editing ? "Save changes" : plan.length > 1 ? `Schedule ${plan.length} classes` : "Schedule class"}
        </button>
        {editing && (
          <button type="button" onClick={onDone} className="text-xs font-semibold text-slate-500">
            Cancel
          </button>
        )}
        {msg && <span className="text-sm font-medium text-forest-700">{msg}</span>}
      </div>
    </form>
  );
}

function RecordingForm({ slug, s, topicHasVideo }: { slug: string; s: CourseSession; topicHasVideo: boolean }) {
  const [url, setUrl] = useState(s.recording ?? "");
  const [toTopic, setToTopic] = useState(!topicHasVideo);
  const [msg, setMsg] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isVideoLink(url)) return setMsg("Use a YouTube, Vimeo or Google Drive link.");
    setMsg("Saving…");
    try {
      await Promise.all([saveLiveSessions(slug, [{ ...s, recording: url }]), url.trim() && s.lessonId && toTopic ? saveLessonVideo(slug, s.lessonId, url, false) : null]);
      setMsg("Saved.");
    } catch {
      setMsg("Couldn't save.");
    }
  };
  return (
    <form onSubmit={save} className="mt-2 flex flex-wrap items-center gap-2">
      <input value={url} onChange={(e) => (setUrl(e.target.value), setMsg(""))} placeholder="Recording link (YouTube / Drive)" aria-label={`Recording for ${s.title}`} className={`${input} sm:w-80`} />
      {s.lessonId && (
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={toTopic} onChange={(e) => setToTopic(e.target.checked)} className="h-4 w-4 accent-forest-700" />
          Also use as the topic&apos;s video
        </label>
      )}
      <button type="submit" disabled={url.trim() === (s.recording ?? "")} className={smallBtn}>
        Save recording
      </button>
      {msg && <span className="text-xs font-medium text-forest-700">{msg}</span>}
    </form>
  );
}

function AdminSessionRow({ slug, s, now, topic, topicHasVideo, onEdit }: { slug: string; s: CourseSession; now: number; topic?: string; topicHasVideo: boolean; onEdit: () => void }) {
  const phase = sessionPhase(s, now);
  const [copied, setCopied] = useState(false);
  const remove = async () => {
    if (!window.confirm(`Delete "${s.title}" (${sessionWhen(s, now)})? Students stop seeing it.`)) return;
    await deleteLiveSession(slug, s.id).catch(() => window.alert("Couldn't delete. Try again."));
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(s.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <li className={`rounded-2xl border p-3 ${phase === "live" ? "border-red-200 bg-red-50/60" : "border-forest-100"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-forest-950">{s.title}</span>
            {phase === "live" && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">● Live now</span>}
            {phase === "ended" && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.recording ? "bg-spark-500/25 text-forest-800" : "bg-amber-100 text-amber-800"}`}>
                {s.recording ? "Recording added" : "Needs recording"}
              </span>
            )}
          </span>
          <span className="block text-sm text-slate-600">{sessionWhen(s, now)}</span>
          {topic && <span className="block text-xs text-slate-500">{topic}</span>}
        </span>
        <span className="flex flex-wrap gap-1.5">
          <button type="button" onClick={copy} className={`${ghostBtn} inline-flex items-center gap-1`} title={s.link}>
            {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />} {copied ? "Copied" : "Copy link"}
          </button>
          <a href={s.link} target="_blank" rel="noopener noreferrer" className={ghostBtn}>
            Open ↗
          </a>
          <button type="button" onClick={onEdit} className={ghostBtn}>
            Edit
          </button>
          <button type="button" onClick={remove} className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
            Delete
          </button>
        </span>
      </div>
      {phase === "ended" && <RecordingForm slug={slug} s={s} topicHasVideo={topicHasVideo} />}
    </li>
  );
}

function ClassesTab({ slug, modules, videos, sessions }: { slug: string; modules: Module[]; videos: Videos; sessions: CourseSession[] | null }) {
  const now = useNow();
  const [editing, setEditing] = useState<CourseSession | null>(null);
  const [showPast, setShowPast] = useState(false);
  const lessons = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const topicName = (id?: string) => {
    if (!id) return undefined;
    const l = lessons.find((x) => x.id === id);
    return l ? `Module ${l.module + 1} · ${l.title}` : undefined;
  };
  const coming = (sessions ?? []).filter((s) => sessionPhase(s, now) !== "ended");
  const past = (sessions ?? []).filter((s) => sessionPhase(s, now) === "ended").reverse();
  const lastLink = sessions?.length ? sessions[sessions.length - 1].link : "";
  const row = (s: CourseSession) => (
    <AdminSessionRow
      key={s.id}
      slug={slug}
      s={s}
      now={now}
      topic={topicName(s.lessonId)}
      topicHasVideo={!!(s.lessonId && (videos.paid[s.lessonId] ?? videos.free[s.lessonId]))}
      onEdit={() => {
        setEditing(s);
        document.getElementById("schedule-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    />
  );

  return (
    <>
      <div id="schedule-form">
        <ScheduleForm slug={slug} lessons={lessons} modules={modules} editing={editing} lastLink={lastLink} onDone={() => setEditing(null)} />
      </div>
      {sessions === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-bold text-forest-950">Upcoming ({coming.length})</p>
            {coming.length ? <ul className="mt-3 space-y-2">{coming.map(row)}</ul> : <p className="mt-2 text-sm text-slate-500">No classes scheduled.</p>}
          </div>
          {past.length > 0 && (
            <div>
              <p className="text-sm font-bold text-forest-950">
                Past classes ({past.length}){" "}
                {past.some((s) => !s.recording) && <span className="font-normal text-amber-700">· {past.filter((s) => !s.recording).length} need a recording</span>}
              </p>
              <ul className="mt-3 space-y-2">{(showPast ? past : past.slice(0, 5)).map(row)}</ul>
              {past.length > 5 && (
                <button type="button" onClick={() => setShowPast((v) => !v)} className="mt-3 text-sm font-semibold text-forest-700 hover:text-forest-500">
                  {showPast ? "Show fewer" : `Show all ${past.length}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ page */

/** Course → module → topic: recorded videos, Meet links and the live-class schedule. */
export function CourseContentCard({ canEditCourse = false }: { canEditCourse?: boolean }) {
  const catalog = useCatalog(true);
  const [slug, setSlug] = useState(() => {
    try {
      const picked = sessionStorage.getItem(PICK_KEY);
      if (picked) {
        sessionStorage.removeItem(PICK_KEY);
        return picked;
      }
    } catch {
      /* ignore */
    }
    return catalog[0]?.slug ?? "";
  });
  const [courseQuery, setCourseQuery] = useState("");
  const [tab, setTab] = useState<"topics" | "classes">("topics");
  const [editingCourse, setEditingCourse] = useState<CatalogCourse | null>(null);
  useEffect(() => {
    if (!slug && catalog[0]) setSlug(catalog[0].slug);
  }, [slug, catalog]);

  const course = catalog.find((c) => c.slug === slug);
  const modules = useMemo(() => modulesFor(syllabusFor(course)), [course]);
  const videos = useCourseVideos(slug || "_", true);
  const sessions = useLiveSessions(slug ? [slug] : []);
  const now = useNow(60_000);

  const options = catalog.filter((c) => c.slug === slug || matchesSearch(courseQuery, courseTitle(c), c.mentor, c.category));
  const lessons = modules.flatMap((m) => m.lessons);
  const withVideo = videos ? lessons.filter((l) => videos.free[l.id] ?? videos.paid[l.id]).length : 0;
  const free = videos ? lessons.filter((l) => videos.free[l.id]).length : 0;
  const upcoming = (sessions ?? []).filter((s) => sessionPhase(s, now) !== "ended");
  const mentorNames = [...new Set([...mentors.map((m) => m.name), ...(course?.mentor ? [course.mentor] : [])])].sort();

  return (
    <Card id="course-content">
      <CardTitle
        title="Course videos & live classes"
        action={
          canEditCourse &&
          course && (
            <button type="button" onClick={() => setEditingCourse(course)} className={ghostBtn}>
              Edit modules &amp; topics
            </button>
          )
        }
      />
      <p className="mt-1 text-sm text-slate-500">
        Pick a course, then add a recorded video to each topic and schedule live classes with a Google Meet link. Enrolled students see them straight away in
        their course and under Live Sessions.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <SearchBox value={courseQuery} onChange={setCourseQuery} placeholder="Find a course" />
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          aria-label="Course"
          className="w-full rounded-full border border-forest-100 bg-white px-4 py-2 text-sm font-semibold text-forest-900 outline-none focus:border-forest-300"
        >
          {options.map((c) => (
            <option key={c.slug} value={c.slug}>
              {courseTitle(c)}
              {c.hidden ? " (hidden)" : ""}
            </option>
          ))}
        </select>
      </div>

      {course && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-forest-50 px-3 py-1 text-forest-800">
            {modules.length} modules · {lessons.length} topics
          </span>
          <span className={`rounded-full px-3 py-1 ${withVideo === lessons.length && lessons.length ? "bg-spark-500/25 text-forest-800" : "bg-amber-100 text-amber-800"}`}>
            {withVideo}/{lessons.length} videos added
          </span>
          {free > 0 && <span className="rounded-full bg-forest-50 px-3 py-1 text-forest-800">{free} free previews</span>}
          <span className="rounded-full bg-forest-50 px-3 py-1 text-forest-800">
            {upcoming.length} upcoming live {upcoming.length === 1 ? "class" : "classes"}
          </span>
        </div>
      )}

      <details className="mt-4 rounded-2xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-forest-800">How to add a class video</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Upload the video to YouTube (
            <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700">
              YouTube Studio ↗
            </a>
            ) and set Visibility to <strong>Unlisted</strong>, so it doesn&apos;t show in YouTube search. Or put it on Google Drive and share it as
            “Anyone with the link”.
          </li>
          <li>Copy the video&apos;s link and paste it next to the topic below, then press Save.</li>
          <li>
            For live classes, create a meeting in{" "}
            <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700">
              Google Meet ↗
            </a>{" "}
            or Google Calendar and paste its link in Live classes. After the class, paste the recording link on the class.
          </li>
        </ol>
        <p className="mt-2 text-xs text-slate-500">
          Video files aren&apos;t stored on the website itself: that needs a paid Firebase plan. YouTube and Drive host them for free and play inside the course.
        </p>
      </details>

      <div className="mt-5 flex gap-1 border-b border-forest-100" role="tablist">
        {(
          [
            ["topics", "Topics & videos", PlayIcon],
            ["classes", `Live classes${upcoming.length ? ` (${upcoming.length})` : ""}`, UsersIcon],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === k ? "border-forest-700 text-forest-900" : "border-transparent text-slate-500 hover:text-forest-700"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {!course ? (
        <EmptyState icon={CalendarIcon} title="Pick a course" />
      ) : !videos ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : tab === "topics" ? (
        <TopicsTab slug={slug} modules={modules} videos={videos} />
      ) : (
        <ClassesTab slug={slug} modules={modules} videos={videos} sessions={sessions} />
      )}

      {editingCourse && <CourseEditor course={editingCourse} mentorNames={mentorNames} onClose={() => setEditingCourse(null)} />}
    </Card>
  );
}
