"use client";

import { useState } from "react";
import { FileIcon } from "../icons";
import { openResume } from "./Resume";
import { Card, CardTitle, EmptyState, SearchBox, matchesSearch } from "./ui";
import { applicationStatus, applicationStatuses, setApplicationStatus, type ApplicationStatus, type JobApplication } from "@/lib/careers";

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const roleName: Record<string, string> = { student: "Student", mentor: "Tutor", employee: "Employee", admin: "Admin" };

/** Admin / jobs.manage: everyone who applied, with their resume and a status to track them. */
export default function ApplicationsCard({ rows, error, jobs }: { rows: JobApplication[] | null; error: string; jobs: { id: string; title: string }[] }) {
  const [filter, setFilter] = useState<ApplicationStatus | "all">("new");
  const [job, setJob] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const all = rows ?? [];
  const forJob = all.filter((a) => !job || a.jobId === job);
  const shown = forJob.filter((a) => (filter === "all" || a.status === filter) && matchesSearch(query, a.name, a.email, a.phone, a.memberId, a.jobTitle, a.note));
  const count = (s: ApplicationStatus) => forJob.filter((a) => a.status === s).length;

  const change = async (a: JobApplication, status: ApplicationStatus) => {
    setBusy(a.id);
    try {
      await setApplicationStatus(a.id, status);
    } catch (err) {
      console.error("Could not update application", err);
      window.alert("Couldn't update the application. Check your connection and Firestore rules.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card id="applications">
      <CardTitle title="Applications" />
      <p className="mt-1 text-sm text-slate-500">People who applied from the Jobs page, with the resume they applied with. New ones are counted on the sidebar until you move them on.</p>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {[...applicationStatuses.map((s) => ({ id: s.id as ApplicationStatus | "all", label: `${s.label} (${count(s.id)})` })), { id: "all" as const, label: `All (${forJob.length})` }].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filter === c.id}
              onClick={() => setFilter(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${filter === c.id ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select value={job} onChange={(e) => setJob(e.target.value)} aria-label="Job" className="rounded-full border border-forest-100 bg-white px-4 py-2 text-sm text-slate-700 lg:ml-auto lg:w-56">
          <option value="">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <SearchBox value={query} onChange={setQuery} placeholder="Search applicants" className="lg:w-64" />
      </div>
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {rows === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : shown.length === 0 ? (
        <EmptyState icon={FileIcon} title={all.length ? "No applications here" : "No applications yet"}>
          Signed-in users apply from the Jobs page with their resume.
        </EmptyState>
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((a) => {
            const st = applicationStatus(a.status);
            return (
              <li key={a.id} className={`rounded-2xl border p-4 ${a.status === "new" ? "border-blue-200 bg-blue-50/40" : "border-forest-100 bg-white"}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-forest-950">
                      {a.name} {a.memberId && <span className="font-mono text-xs text-forest-700">{a.memberId}</span>}{" "}
                      <span className="ml-1 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold text-forest-700">{roleName[a.role] ?? a.role}</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Applied for <strong className="text-forest-900">{a.jobTitle}</strong> · {a.createdAt ? when.format(a.createdAt.toDate()) : "just now"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <a href={`mailto:${a.email}`} className="hover:text-forest-700">
                        {a.email}
                      </a>
                      {a.phone && (
                        <>
                          {" · "}
                          <a href={`tel:${a.phone}`} className="hover:text-forest-700">
                            {a.phone}
                          </a>
                        </>
                      )}
                    </p>
                    {a.note && <p className="mt-2 whitespace-pre-line rounded-xl bg-white px-3 py-2 text-sm text-slate-700">{a.note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => openResume(a.resumePath)} className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-600">
                      <FileIcon className="h-3.5 w-3.5" /> Resume
                    </button>
                    <select
                      value={a.status}
                      disabled={busy === a.id}
                      onChange={(e) => change(a, e.target.value as ApplicationStatus)}
                      aria-label={`Status for ${a.name}`}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${st.tone}`}
                    >
                      {applicationStatuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-2 truncate text-xs text-slate-400" title={a.resumeName}>
                  {a.resumeName}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
