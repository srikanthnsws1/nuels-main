"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, ClockIcon, PlayIcon, UsersIcon } from "../icons";
import { Card, CardTitle, EmptyState } from "../dashboard/ui";
import { modulesFor } from "@/data/learning";
import { courseTitle, syllabusFor, useCatalog } from "@/lib/catalog";
import { calendarLink, sessionPhase, type CourseSession } from "@/lib/learning";

/** The current time, refreshed every `ms` so "Live now" and "Join" flip on their own. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

/** "Today, 6:00 pm – 7:00 pm", "Tomorrow, …" or "Fri, 21 Nov, …". */
export function sessionWhen(s: Pick<CourseSession, "startsAt" | "minutes">, now = Date.now()) {
  const start = new Date(s.startsAt);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(start) - day(new Date(now))) / 86_400_000);
  const label = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : dayFmt.format(start);
  return `${label}, ${timeFmt.format(start)} – ${timeFmt.format(new Date(s.startsAt + s.minutes * 60_000))}`;
}

/** Course and topic names for sessions, from the live catalog. */
export function useSessionNames() {
  const catalog = useCatalog(true);
  return {
    course: (slug: string) => {
      const c = catalog.find((x) => x.slug === slug);
      return c ? courseTitle(c) : slug;
    },
    topic: (slug: string, lessonId?: string) => {
      if (!lessonId) return undefined;
      const modules = modulesFor(syllabusFor(catalog.find((x) => x.slug === slug)));
      for (const [i, m] of modules.entries()) {
        const l = m.lessons.find((x) => x.id === lessonId);
        if (l) return `Module ${i + 1} · ${l.title}`;
      }
      return undefined;
    },
  };
}

const phaseBadge = {
  live: "bg-red-500 text-white",
  soon: "bg-amber-400 text-forest-950",
  upcoming: "bg-forest-50 text-forest-700",
  ended: "bg-slate-100 text-slate-500",
} as const;

function SessionRow({ s, now, showCourse }: { s: CourseSession; now: number; showCourse: boolean }) {
  const names = useSessionNames();
  const phase = sessionPhase(s, now);
  const topic = names.topic(s.slug, s.lessonId);
  const mins = Math.max(1, Math.round((s.startsAt - now) / 60_000));
  return (
    <li className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${phase === "live" ? "border-red-200 bg-red-50/60" : "border-forest-100"}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${phase === "ended" ? "bg-slate-100 text-slate-500" : "bg-forest-700 text-spark-400"}`}>
        {phase === "ended" ? <PlayIcon className="h-5 w-5" /> : <UsersIcon className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-forest-950">{s.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${phaseBadge[phase]}`}>
            {phase === "live" ? "● Live now" : phase === "soon" ? `Starts in ${mins} min` : phase === "ended" ? "Ended" : "Upcoming"}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
          <ClockIcon className="h-3.5 w-3.5 shrink-0" /> {sessionWhen(s, now)}
        </span>
        {(showCourse || topic) && (
          <span className="block text-xs text-slate-500">
            {[showCourse ? names.course(s.slug) : null, topic].filter(Boolean).join(" · ")}
          </span>
        )}
        {s.note && <span className="mt-1 block whitespace-pre-wrap text-xs text-slate-600">{s.note}</span>}
      </span>
      <span className="flex shrink-0 flex-wrap gap-2">
        {phase === "ended" ? (
          s.recording ? (
            <a href={s.recording} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-600">
              <PlayIcon className="h-3.5 w-3.5" /> Watch recording
            </a>
          ) : (
            <span className="text-xs text-slate-500">Recording coming soon</span>
          )
        ) : (
          <>
            {phase === "upcoming" && (
              <a
                href={calendarLink(s, names.course(s.slug))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-forest-200 px-3 py-2 text-xs font-semibold text-forest-700 hover:bg-forest-50"
              >
                <CalendarIcon className="h-3.5 w-3.5" /> Add to calendar
              </a>
            )}
            <a
              href={s.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                phase === "upcoming" ? "border border-forest-200 text-forest-700 hover:bg-forest-50" : "bg-spark-500 text-forest-900 shadow-md shadow-spark-500/30 hover:bg-spark-400"
              }`}
            >
              Join class ↗
            </a>
          </>
        )}
      </span>
    </li>
  );
}

/** Upcoming and past live classes. `showCourse` adds the course name to each row. */
export function SessionList({ sessions, showCourse = false, pastLimit = 10 }: { sessions: CourseSession[]; showCourse?: boolean; pastLimit?: number }) {
  const now = useNow();
  const [allPast, setAllPast] = useState(false);
  const coming = sessions.filter((s) => sessionPhase(s, now) !== "ended");
  const past = sessions.filter((s) => sessionPhase(s, now) === "ended").reverse();
  return (
    <div className="mt-5 space-y-6">
      <div>
        <p className="text-sm font-bold text-forest-950">Upcoming classes</p>
        {coming.length ? (
          <ul className="mt-3 space-y-3">
            {coming.map((s) => (
              <SessionRow key={`${s.slug}-${s.id}`} s={s} now={now} showCourse={showCourse} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No classes scheduled right now. New classes appear here as soon as they&apos;re scheduled.</p>
        )}
      </div>
      {past.length > 0 && (
        <div>
          <p className="text-sm font-bold text-forest-950">Past classes</p>
          <ul className="mt-3 space-y-3">
            {(allPast ? past : past.slice(0, pastLimit)).map((s) => (
              <SessionRow key={`${s.slug}-${s.id}`} s={s} now={now} showCourse={showCourse} />
            ))}
          </ul>
          {past.length > pastLimit && (
            <button type="button" onClick={() => setAllPast((v) => !v)} className="mt-3 text-sm font-semibold text-forest-700 hover:text-forest-500">
              {allPast ? "Show fewer" : `Show all ${past.length} past classes`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A card with every live class of the given (enrolled) courses. */
export function LiveSessionsCard({ sessions, showCourse = false }: { sessions: CourseSession[] | null; showCourse?: boolean }) {
  return (
    <Card id="schedule">
      <CardTitle title="Live classes" />
      <p className="mt-1 text-sm text-slate-500">Join on Google Meet from here. The Join button lights up 30 minutes before each class.</p>
      {sessions === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : sessions.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="No classes scheduled yet">
          Your mentor&apos;s live classes will appear here with a Join button.
        </EmptyState>
      ) : (
        <SessionList sessions={sessions} showCourse={showCourse} />
      )}
    </Card>
  );
}

/** A strip for the next class (live now, or within the next 7 days). */
export function NextSessionBanner({ sessions, href, showCourse = true }: { sessions: CourseSession[] | null; href: string; showCourse?: boolean }) {
  const now = useNow();
  const names = useSessionNames();
  const next = sessions?.find((s) => sessionPhase(s, now) !== "ended" && s.startsAt - now < 7 * 86_400_000);
  if (!next) return null;
  const phase = sessionPhase(next, now);
  const near = phase === "live" || phase === "soon";
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-3xl border p-4 sm:p-5 ${near ? "border-red-200 bg-red-50" : "border-forest-100 bg-white"}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
        <UsersIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-forest-950">
          {phase === "live" ? "Live class is on now: " : "Next live class: "}
          {next.title}
        </span>
        <span className="block text-sm text-slate-600">
          {sessionWhen(next, now)}
          {showCourse && ` · ${names.course(next.slug)}`}
        </span>
      </span>
      {near ? (
        <a href={next.link} target="_blank" rel="noopener noreferrer" className="rounded-full bg-spark-500 px-5 py-2.5 text-sm font-bold text-forest-900 hover:bg-spark-400">
          Join class ↗
        </a>
      ) : (
        <a href={href} className="text-sm font-semibold text-forest-700 hover:text-forest-500">
          See schedule →
        </a>
      )}
    </div>
  );
}

/** Classes still to come today, for the sidebar badge. */
export function classesLeftToday(sessions: CourseSession[] | null, now = Date.now()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return (sessions ?? []).filter((s) => sessionPhase(s, now) !== "ended" && s.startsAt <= end.getTime()).length;
}
