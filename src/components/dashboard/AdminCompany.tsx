"use client";
/* eslint-disable @next/next/no-img-element -- gallery previews are data-URL images */

import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { AwardIcon, BriefcaseIcon, CheckIcon, ClockIcon, GraduationIcon, ImageIcon } from "../icons";
import { Card, CardTitle, EmptyState, SearchBox, StatTiles, matchesSearch } from "./ui";
import { assignmentsFor, modulesFor } from "@/data/learning";
import type { AppUser } from "@/lib/auth";
import { courseTitle, syllabusFor, useCatalog } from "@/lib/catalog";
import {
  addGalleryImage,
  deleteGalleryImage,
  deleteJob,
  galleryCategories,
  issueCertificate,
  jobTypes,
  revokeCertificate,
  saveJob,
  setJobOpen,
  updateGalleryItem,
  useCertificates,
  useGallery,
  useJobs,
  type GalleryItem,
  type Job,
  type JobInput,
} from "@/lib/company";
import { db } from "@/lib/firebase";
import { compressImage } from "@/lib/image";
import type { CourseProgress } from "@/lib/learning";

const input = "w-full rounded-2xl border border-forest-100 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-forest-300";
const btn = "rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60";
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Chips<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={value === c.id}
          onClick={() => onChange(c.id)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${value === c.id ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ======================= Job openings =======================

const emptyJob: JobInput = { title: "", department: "", location: "Hyderabad", type: "Full-time", experience: "", description: "", apply: "careers@nuelsmart.com", open: true };

function JobForm({ initial, onDone }: { initial?: Job; onDone: () => void }) {
  const [f, setF] = useState<JobInput>(() => (initial ? { ...emptyJob, ...initial } : emptyJob));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof JobInput>(k: K, v: JobInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.department.trim() || !f.location.trim() || !f.description.trim()) return setError("Fill in the title, department, location and description.");
    const apply = f.apply.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(apply) && !/^https:\/\//.test(apply)) return setError("“How to apply” must be an email address or an https:// link.");
    setBusy(true);
    setError("");
    try {
      // Firestore rejects undefined values, so blank optional fields are left out.
      const { id: _id, createdAt: _created, ...fields } = { ...f, apply } as Job;
      void _id;
      void _created;
      const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== "")) as JobInput;
      await saveJob(clean, initial?.id);
      onDone();
    } catch (err) {
      console.error("Could not save job", err);
      setError("Couldn't save. Check your connection and Firestore rules.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-4 grid gap-3 rounded-2xl bg-forest-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Job title (e.g. Python Trainer)" aria-label="Job title" className={`${input} lg:col-span-2`} />
      <input value={f.department} onChange={(e) => set("department", e.target.value)} placeholder="Department (e.g. Training)" aria-label="Department" className={input} />
      <input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Location" aria-label="Location" className={input} />
      <select value={f.type} onChange={(e) => set("type", e.target.value as Job["type"])} aria-label="Job type" className={input}>
        {jobTypes.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <input value={f.experience} onChange={(e) => set("experience", e.target.value)} placeholder="Experience (e.g. 0–2 years, Freshers)" aria-label="Experience" className={input} />
      <input type="number" min={1} value={f.openings ?? ""} onChange={(e) => set("openings", e.target.value ? Number(e.target.value) : undefined)} placeholder="Openings (optional)" aria-label="Openings" className={input} />
      <label className="block text-sm">
        <span className="sr-only">Last date to apply</span>
        <input type="date" value={f.lastDate ?? ""} onChange={(e) => set("lastDate", e.target.value || undefined)} aria-label="Last date to apply" className={input} />
      </label>
      <input value={f.apply} onChange={(e) => set("apply", e.target.value)} placeholder="How to apply: email or https:// form link" aria-label="How to apply" className={input} />
      <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={5} maxLength={3000} placeholder="Role, responsibilities, skills needed, salary range…" aria-label="Description" className={`${input} resize-none sm:col-span-2 lg:col-span-3`} />
      {error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 sm:col-span-2 lg:col-span-3">{error}</p>}
      <div className="flex gap-3 sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={busy} className={btn}>
          {busy ? "Saving…" : initial ? "Save changes" : "Post job"}
        </button>
        <button type="button" onClick={onDone} className="rounded-full border border-forest-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Admin: job openings at Nuel Smart, shown to learners on their Jobs page. */
export function AdminJobs() {
  const { rows, error } = useJobs();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [query, setQuery] = useState("");
  const all = rows ?? [];
  const shown = all.filter((j) => (filter === "all" || (filter === "open") === j.open) && matchesSearch(query, j.title, j.department, j.location, j.type, j.description));
  const act = (job: () => Promise<unknown>) => job().catch((err) => console.error("Job update failed", err));

  return (
    <Card>
      <CardTitle
        title="Job openings"
        action={
          editing === null ? (
            <button type="button" onClick={() => setEditing("new")} className="rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-forest-600">
              + Post a job
            </button>
          ) : undefined
        }
      />
      <p className="mt-1 text-sm text-slate-500">Openings at Nuel Smart. Open jobs show on every learner&apos;s Jobs page, newest first.</p>
      {editing === "new" && <JobForm onDone={() => setEditing(null)} />}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips
          value={filter}
          onChange={setFilter}
          items={[
            { id: "open", label: `Open (${all.filter((j) => j.open).length})` },
            { id: "closed", label: `Closed (${all.filter((j) => !j.open).length})` },
            { id: "all", label: `All (${all.length})` },
          ]}
        />
        <SearchBox value={query} onChange={setQuery} placeholder="Search jobs" className="sm:w-64" />
      </div>
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {rows === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : shown.length === 0 ? (
        <EmptyState icon={BriefcaseIcon} title={all.length ? "No jobs match" : "No jobs posted yet"} />
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((j) => (
            <li key={j.id} className="rounded-2xl border border-forest-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-forest-950">
                    {j.title}{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${j.open ? "bg-spark-500/25 text-forest-800" : "bg-slate-100 text-slate-500"}`}>{j.open ? "Open" : "Closed"}</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {j.department} · {j.location} · {j.type}
                    {j.experience && ` · ${j.experience}`}
                    {j.lastDate && ` · Apply by ${dateFmt.format(new Date(j.lastDate))}`}
                  </p>
                  <p className="text-xs text-slate-400">Posted {j.createdAt ? dateFmt.format(j.createdAt.toDate()) : "just now"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditing(editing === j.id ? null : j.id)} className="rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold text-forest-700 hover:bg-forest-50">
                    Edit
                  </button>
                  <button type="button" onClick={() => act(() => setJobOpen(j.id, !j.open))} className="rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold text-forest-700 hover:bg-forest-50">
                    {j.open ? "Close" : "Reopen"}
                  </button>
                  <button type="button" onClick={() => window.confirm(`Delete “${j.title}”?`) && act(() => deleteJob(j.id))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
              {editing === j.id && <JobForm initial={j} onDone={() => setEditing(null)} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ======================= Gallery =======================

/** Admin: upload company, employee and event photos for the learners' Gallery page. */
export function AdminGallery({ me }: { me: AppUser }) {
  const { rows, error } = useGallery();
  const [category, setCategory] = useState<GalleryItem["category"]>("Company");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<"all" | GalleryItem["category"]>("all");
  const [query, setQuery] = useState("");
  const all = rows ?? [];
  const shown = all.filter((g) => (filter === "all" || g.category === filter) && matchesSearch(query, g.title, g.category));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setMsg("");
    let done = 0;
    for (const file of Array.from(files)) {
      setBusy(`Uploading ${done + 1} of ${files.length}…`);
      try {
        const [image, thumb] = await Promise.all([compressImage(file, { maxSide: 1600 }), compressImage(file, { maxSide: 480 })]);
        const name = title.trim() || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        await addGalleryImage({ title: name.slice(0, 100), category, thumb, image }, me.uid);
        done++;
      } catch (err) {
        console.error("Upload failed", err);
        setMsg(`${file.name}: ${(err as Error).message || "upload failed"}`);
      }
    }
    setBusy("");
    setTitle("");
    if (done) setMsg(`${done} ${done === 1 ? "photo" : "photos"} added.`);
  };

  const rename = (g: GalleryItem) => {
    const t = window.prompt("Photo title", g.title);
    if (t && t.trim()) updateGalleryItem(g.id, { title: t.trim().slice(0, 100), category: g.category }).catch(() => setMsg("Couldn't rename."));
  };

  return (
    <Card>
      <CardTitle title="Gallery" />
      <p className="mt-1 text-sm text-slate-500">Photos of the company, team and events. Learners see them on their Gallery page.</p>
      <div className="mt-5 grid gap-3 rounded-2xl bg-forest-50/60 p-4 sm:grid-cols-[1fr_200px_auto] sm:items-center">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional; otherwise the file name)" aria-label="Photo title" className={input} />
        <select value={category} onChange={(e) => setCategory(e.target.value as GalleryItem["category"])} aria-label="Category" className={input}>
          {galleryCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className={`${btn} cursor-pointer text-center ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy || "Upload photos"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => (upload(e.target.files), (e.target.value = ""))} />
        </label>
      </div>
      {(msg || error) && <p className="mt-3 text-sm font-medium text-forest-700">{msg || error}</p>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips
          value={filter}
          onChange={setFilter}
          items={[{ id: "all" as const, label: `All (${all.length})` }, ...galleryCategories.map((c) => ({ id: c, label: `${c} (${all.filter((g) => g.category === c).length})` }))]}
        />
        <SearchBox value={query} onChange={setQuery} placeholder="Search photos" className="sm:w-56" />
      </div>
      {rows === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : shown.length === 0 ? (
        <EmptyState icon={ImageIcon} title={all.length ? "No photos match" : "No photos yet"} />
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shown.map((g) => (
            <li key={g.id} className="overflow-hidden rounded-2xl border border-forest-100">
              <img src={g.thumb} alt={g.title} className="aspect-square w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-sm font-semibold text-forest-950">{g.title}</p>
                <p className="text-xs text-slate-500">{g.category}</p>
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => rename(g)} className="text-xs font-semibold text-forest-700">
                    Rename
                  </button>
                  <select
                    value={g.category}
                    onChange={(e) => updateGalleryItem(g.id, { title: g.title, category: e.target.value as GalleryItem["category"] })}
                    aria-label={`Category of ${g.title}`}
                    className="min-w-0 flex-1 bg-transparent text-xs text-slate-600"
                  >
                    {galleryCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => window.confirm(`Delete “${g.title}”?`) && deleteGalleryImage(g.id).catch(() => setMsg("Couldn't delete."))} className="text-xs font-semibold text-red-600">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ======================= Completions & certificates =======================

type ProgressRow = CourseProgress & { id: string; uid: string; slug: string };
export type CertUser = { uid: string; name: string; email: string; memberId?: string; institution?: string };

/** Admin: learners who finished every lesson and assignment of a course, and their certificates. */
export function AdminCertificates({ me, users }: { me: AppUser; users: CertUser[] | null }) {
  const [records, setRecords] = useState<ProgressRow[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const certs = useCertificates();
  const catalog = useCatalog(true);
  const [filter, setFilter] = useState<"eligible" | "certified" | "progress">("eligible");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(
    () =>
      onSnapshot(
        collection(db, "progress"),
        (snap) => setRecords(snap.docs.map((d) => ({ completed: [], assignments: {}, docs: [], attendance: [], interviews: [], grades: {}, ...(d.data() as Partial<ProgressRow>), id: d.id }) as ProgressRow)),
        () => setLoadError("Couldn't load learner progress. Make sure the Firestore rules are deployed."),
      ),
    [],
  );

  const certified = new Map((certs.rows ?? []).map((c) => [`${c.uid}_${c.slug}`, c]));
  const rows = (records ?? [])
    .map((r) => {
      const course = catalog.find((c) => c.slug === r.slug);
      const syllabus = syllabusFor(course);
      const lessons = modulesFor(syllabus).flatMap((m) => m.lessons);
      const tasks = assignmentsFor(syllabus);
      const lessonsDone = lessons.filter((l) => r.completed.includes(l.id)).length;
      const tasksDone = tasks.filter((a) => r.assignments[a.id]).length;
      const graded = tasks.filter((a) => r.grades[a.id]).length;
      const scores = tasks.map((a) => r.grades[a.id]?.score).filter((s): s is number => typeof s === "number");
      const user = users?.find((u) => u.uid === r.uid);
      return {
        r,
        user,
        title: course ? courseTitle(course) : r.slug,
        lessons: lessons.length,
        lessonsDone,
        tasks: tasks.length,
        tasksDone,
        graded,
        avg: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null,
        pct: lessons.length ? Math.round((lessonsDone / lessons.length) * 100) : 0,
        complete: lessons.length > 0 && lessonsDone === lessons.length && tasksDone === tasks.length,
        cert: certified.get(r.id),
      };
    })
    .filter((x) => x.user);
  const eligible = rows.filter((x) => x.complete && !x.cert);
  const done = rows.filter((x) => x.cert);
  const progress = rows.filter((x) => !x.complete && !x.cert).sort((a, b) => b.pct - a.pct);
  const list = (filter === "eligible" ? eligible : filter === "certified" ? done : progress).filter((x) =>
    matchesSearch(query, x.user?.name, x.user?.memberId, x.user?.email, x.user?.institution, x.title, x.cert?.number),
  );

  const issue = async (x: (typeof rows)[number]) => {
    if (!x.user) return;
    const ungraded = x.tasks - x.graded;
    if (!window.confirm(`Issue the certificate for ${x.title} to ${x.user.name}?${ungraded ? `\n\n${ungraded} assignment(s) aren't graded yet.` : ""}`)) return;
    setBusy(x.r.id);
    setMsg("");
    try {
      await issueCertificate({ uid: x.r.uid, name: x.user.name, ...(x.user.memberId ? { memberId: x.user.memberId } : {}), slug: x.r.slug, courseTitle: x.title, issuedByName: me.name }, me.uid);
      setMsg(`Certificate issued to ${x.user.name}. They can download it from their Certificates page.`);
    } catch (err) {
      console.error("Could not issue", err);
      setMsg("Couldn't issue the certificate. Check your connection and Firestore rules.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <StatTiles
        stats={[
          { label: "Ready for a certificate", value: records === null ? "—" : eligible.length, icon: AwardIcon },
          { label: "Certificates issued", value: certs.rows === null ? "—" : done.length, icon: CheckIcon },
          { label: "Still learning", value: records === null ? "—" : progress.length, icon: ClockIcon },
          { label: "Course records", value: records === null ? "—" : rows.length, icon: GraduationIcon },
        ]}
      />
      <Card>
        <CardTitle title="Completed courses & certificates" />
        <p className="mt-1 text-sm text-slate-500">A learner is eligible once every lesson is marked done and every assignment is submitted. Check the grades, then issue the certificate.</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Chips
            value={filter}
            onChange={setFilter}
            items={[
              { id: "eligible", label: `Eligible (${eligible.length})` },
              { id: "certified", label: `Certified (${done.length})` },
              { id: "progress", label: `In progress (${progress.length})` },
            ]}
          />
          <SearchBox value={query} onChange={setQuery} placeholder="Search student, ID, course, certificate no." className="sm:w-80" />
        </div>
        {(loadError || certs.error || msg) && <p className="mt-4 text-sm font-medium text-forest-700">{loadError || certs.error || msg}</p>}
        {records === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState icon={AwardIcon} title={filter === "eligible" ? "Nobody is waiting for a certificate" : filter === "certified" ? "No certificates issued yet" : "No learners in progress"} />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  {["Student", "Course", "Lessons", "Assignments", "Avg grade", filter === "certified" ? "Certificate" : ""].map((h) => (
                    <th key={h} className="pb-3 pr-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {list.map((x) => (
                  <tr key={x.r.id}>
                    <td className="py-3 pr-4">
                      <span className="block font-semibold text-forest-950">{x.user?.name}</span>
                      <span className="font-mono text-xs text-forest-600">{x.user?.memberId}</span>
                    </td>
                    <td className="max-w-[16rem] py-3 pr-4 text-slate-700">{x.title}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {x.lessonsDone}/{x.lessons} <span className="text-xs text-slate-400">({x.pct}%)</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {x.tasksDone}/{x.tasks}
                      {x.tasksDone > x.graded && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{x.tasksDone - x.graded} to grade</span>}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{x.avg === null ? "—" : `${x.avg}/100`}</td>
                    <td className="py-3 text-right">
                      {x.cert ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-forest-700">{x.cert.number}</span>
                          <button
                            type="button"
                            onClick={() => window.confirm(`Withdraw certificate ${x.cert!.number}?`) && revokeCertificate(x.cert!.id).catch(() => setMsg("Couldn't withdraw."))}
                            className="text-xs font-semibold text-red-600"
                          >
                            Withdraw
                          </button>
                        </span>
                      ) : x.complete ? (
                        <button type="button" disabled={busy === x.r.id} onClick={() => issue(x)} className="rounded-full bg-forest-700 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-600 disabled:opacity-60">
                          {busy === x.r.id ? "Issuing…" : "Issue certificate"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
