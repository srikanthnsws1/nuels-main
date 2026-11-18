"use client";
/* eslint-disable @next/next/no-img-element -- gallery and certificate images are data URLs */

import { useEffect, useState } from "react";
import Logo from "../Logo";
import { ArrowLeftIcon, ArrowRightIcon, AwardIcon, BriefcaseIcon, CheckIcon, CloseIcon, ImageIcon, PinIcon } from "../icons";
import Link from "next/link";
import SupportForm from "../SupportForm";
import Dialog from "./Dialog";
import { ResumeBox } from "./Resume";
import { MyTickets } from "./Requests";
import { Card, CardTitle, EmptyState } from "./ui";
import { useAuth, type AppUser } from "@/lib/auth";
import { applicationStatus, applyToJob, useMyApplications, useResume } from "@/lib/careers";
import { applyHref, galleryCategories, isNewJob, loadGalleryImage, useGallery, useJobs, useMyCertificates, type Certificate, type GalleryItem, type Job } from "@/lib/company";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

// ---------------- Jobs at Nuel Smart ----------------

function ApplyDialog({ user, job, onClose }: { user: AppUser; job: Job; onClose: () => void }) {
  const resume = useResume(user.uid);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const submit = async () => {
    if (!resume) return setError("Upload your resume first.");
    setSending(true);
    setError("");
    try {
      await applyToJob(user, job, resume, note);
      setDone(true);
    } catch (err) {
      console.error("Could not apply", err);
      setError("Couldn't send your application. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };
  if (done)
    return (
      <Dialog title="Application sent" onClose={onClose}>
        <div className="py-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-spark-500 text-forest-900">
            <CheckIcon className="h-7 w-7" />
          </span>
          <p className="mt-4 font-semibold text-forest-950">You applied for {job.title}</p>
          <p className="mt-1 text-sm text-slate-600">Our team will review your resume and contact you by email or phone.</p>
          <button type="button" onClick={onClose} className="mt-6 rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white hover:bg-forest-600">
            Done
          </button>
        </div>
      </Dialog>
    );
  return (
    <Dialog title={`Apply: ${job.title}`} onClose={onClose}>
      <p className="mt-1 text-sm text-slate-600">
        {job.department} · {job.location} · {job.type}
      </p>
      <p className="mt-5 mb-2 text-sm font-medium text-forest-900">Your resume</p>
      <ResumeBox uid={user.uid} compact />
      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">
          Note to the team <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Why you're a good fit, notice period, preferred timings…"
          className="w-full resize-none rounded-2xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-forest-300"
        />
      </label>
      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={sending || !resume}
        className="mt-6 w-full rounded-full bg-forest-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 hover:bg-forest-600 disabled:opacity-50"
      >
        {sending ? "Sending…" : resume ? "Send application" : "Upload your resume to apply"}
      </button>
    </Dialog>
  );
}

export function JobsPage() {
  const { rows, error } = useJobs();
  const { user } = useAuth();
  const mine = useMyApplications(user?.uid);
  const jobs = (rows ?? []).filter((j) => j.open && (!j.lastDate || j.lastDate >= new Date().toISOString().slice(0, 10)));
  const [open, setOpen] = useState<string | null>(null);
  const [applying, setApplying] = useState<Job | null>(null);
  const applied = (id: string) => (mine.rows ?? []).find((a) => a.jobId === id);
  return (
    <Card id="jobs">
      <CardTitle title="Jobs at Nuel Smart" />
      <p className="mt-1 text-sm text-slate-500">Current openings in our team. New posts show here first.</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {rows === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : jobs.length === 0 ? (
        <EmptyState icon={BriefcaseIcon} title="No openings right now">
          Check back soon. New jobs at Nuel Smart are announced here.
        </EmptyState>
      ) : (
        <ul className="mt-5 space-y-3">
          {jobs.map((j) => (
            <li key={j.id} className="rounded-2xl border border-forest-100 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-forest-950">
                    {j.title}
                    {isNewJob(j) && <span className="ml-2 rounded-full bg-spark-500 px-2 py-0.5 align-middle text-[11px] font-bold text-forest-900">NEW</span>}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                    <span>{j.department}</span>
                    <span className="inline-flex items-center gap-1">
                      <PinIcon className="h-3.5 w-3.5" /> {j.location}
                    </span>
                    <span className="rounded-full bg-forest-50 px-2 py-0.5 text-xs font-semibold text-forest-700">{j.type}</span>
                    {j.experience && <span>{j.experience}</span>}
                    {j.openings && <span>{j.openings} {j.openings === 1 ? "opening" : "openings"}</span>}
                  </p>
                  {j.lastDate && <p className="mt-1 text-xs font-medium text-amber-700">Apply by {dateFmt.format(new Date(j.lastDate))}</p>}
                </div>
                {applied(j.id) ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-spark-500/25 px-4 py-2 text-sm font-semibold text-forest-800">
                    <CheckIcon className="h-4 w-4" /> Applied · {applicationStatus(applied(j.id)!.status).label}
                  </span>
                ) : user ? (
                  <button type="button" onClick={() => setApplying(j)} className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600">
                    Apply <ArrowRightIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <Link href="/login?next=/jobs" className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600">
                    Log in to apply <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                )}
              </div>
              <button type="button" onClick={() => setOpen(open === j.id ? null : j.id)} className="mt-2 text-sm font-semibold text-forest-700 hover:text-forest-500">
                {open === j.id ? "Hide details" : "View details"}
              </button>
              {open === j.id && (
                <div className="mt-2 rounded-xl bg-forest-50/60 p-4 text-sm leading-relaxed text-slate-700">
                  <p className="whitespace-pre-line">{j.description}</p>
                  {j.apply?.trim() && (
                    <p className="mt-3 text-xs text-slate-500">
                      You can also apply at{" "}
                      <a href={applyHref(j)} target={applyHref(j).startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer" className="font-semibold text-forest-700">
                        {j.apply.trim()}
                      </a>
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!user && jobs.length > 0 && (
        <p className="mt-4 text-sm text-slate-500">
          New here?{" "}
          <Link href="/register" className="font-semibold text-forest-700">
            Create a free account
          </Link>{" "}
          to upload your resume and apply.
        </p>
      )}
      {applying && user && <ApplyDialog user={user} job={applying} onClose={() => setApplying(null)} />}
    </Card>
  );
}

// ---------------- Gallery ----------------

function Lightbox({ items, index, onClose, onMove }: { items: GalleryItem[]; index: number; onClose: () => void; onMove: (i: number) => void }) {
  const item = items[index];
  const [full, setFull] = useState<{ id: string; src: string | null } | null>(null);
  useEffect(() => {
    let live = true;
    loadGalleryImage(item.id).then((src) => live && setFull({ id: item.id, src }), () => live && setFull({ id: item.id, src: null }));
    return () => {
      live = false;
    };
  }, [item.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < items.length - 1) onMove(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onMove(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onMove]);
  const src = full?.id === item.id && full.src ? full.src : item.thumb;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-forest-950/95 p-4" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="flex items-center justify-between gap-3 text-white">
        <p className="min-w-0 truncate font-semibold">
          {item.title} <span className="text-sm font-normal text-forest-200">· {item.category}</span>
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
          <CloseIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
        <img src={src} alt={item.title} className="max-h-full max-w-full rounded-xl object-contain" />
        {index > 0 && (
          <button type="button" onClick={() => onMove(index - 1)} aria-label="Previous photo" className="absolute left-0 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        )}
        {index < items.length - 1 && (
          <button type="button" onClick={() => onMove(index + 1)} aria-label="Next photo" className="absolute right-0 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="text-center text-sm text-forest-200">
        {index + 1} / {items.length}
      </p>
    </div>
  );
}

export function GalleryPage() {
  const { rows, error } = useGallery();
  const [filter, setFilter] = useState<"All" | GalleryItem["category"]>("All");
  const [open, setOpen] = useState<number | null>(null);
  const all = rows ?? [];
  const shown = filter === "All" ? all : all.filter((g) => g.category === filter);
  const cats = galleryCategories.filter((c) => all.some((g) => g.category === c));
  return (
    <Card id="gallery">
      <CardTitle title="Gallery" />
      <p className="mt-1 text-sm text-slate-500">Life at Nuel Smart: our company, team and events.</p>
      {cats.length > 1 && (
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
          {(["All", ...cats] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${filter === c ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {rows === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : shown.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No photos yet" />
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((g, i) => (
            <li key={g.id}>
              <button type="button" onClick={() => setOpen(i)} className="group block w-full overflow-hidden rounded-2xl text-left">
                <img src={g.thumb} alt={g.title} loading="lazy" className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="mt-1.5 block truncate text-sm font-medium text-forest-950">{g.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open !== null && shown[open] && <Lightbox items={shown} index={open} onClose={() => setOpen(null)} onMove={setOpen} />}
    </Card>
  );
}

// ---------------- Certificates ----------------

function CertificateView({ c, onClose }: { c: Certificate; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-forest-950/80 p-4" role="dialog" aria-modal="true" aria-label="Certificate">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="rounded-full bg-spark-500 px-5 py-2.5 text-sm font-bold text-forest-900 hover:bg-spark-400">
            Print / Save as PDF
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
            Close
          </button>
        </div>
        <article className="print-cert relative aspect-[1.414] w-full overflow-hidden rounded-2xl bg-white p-[5%] text-center shadow-2xl">
          <div className="absolute inset-[2.5%] rounded-xl border-4 border-double border-forest-700" />
          <div className="relative flex h-full flex-col items-center justify-between">
            <Logo />
            <div>
              <p className="text-[clamp(0.6rem,1.6vw,0.85rem)] font-bold uppercase tracking-[0.3em] text-forest-600">Certificate of completion</p>
              <p className="mt-[2%] text-[clamp(0.7rem,1.8vw,1rem)] text-slate-500">This is to certify that</p>
              <p className="mt-[1%] font-serif text-[clamp(1.4rem,5vw,3rem)] font-bold text-forest-950">{c.name}</p>
              {c.memberId && <p className="font-mono text-[clamp(0.6rem,1.4vw,0.85rem)] text-forest-600">Student ID {c.memberId}</p>}
              <p className="mt-[2%] text-[clamp(0.7rem,1.8vw,1rem)] text-slate-500">has successfully completed the course</p>
              <p className="mt-[1%] text-[clamp(1rem,3vw,1.75rem)] font-bold text-forest-800">{c.courseTitle}</p>
              <p className="mt-[1%] text-[clamp(0.6rem,1.5vw,0.9rem)] text-slate-500">with all lessons and assignments, at Nuel Smart.</p>
            </div>
            <div className="flex w-full items-end justify-between text-left text-[clamp(0.55rem,1.4vw,0.85rem)] text-slate-600">
              <div>
                <p className="font-semibold text-forest-950">{c.createdAt ? dateFmt.format(c.createdAt.toDate()) : ""}</p>
                <p>Date of issue</p>
              </div>
              <AwardIcon className="h-[clamp(2rem,7vw,4.5rem)] w-[clamp(2rem,7vw,4.5rem)] text-spark-500" />
              <div className="text-right">
                <p className="font-mono font-semibold text-forest-950">{c.number}</p>
                <p>Certificate no. · nuelsmart.com</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export function CertificatesPage({ user }: { user: AppUser }) {
  const certs = useMyCertificates(user.uid);
  const [view, setView] = useState<Certificate | null>(null);
  return (
    <Card id="certificates">
      <CardTitle title="Certificates" />
      <p className="mt-1 text-sm text-slate-500">Finish every lesson and assignment of a course and our team issues your certificate here.</p>
      {certs === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : certs.length === 0 ? (
        <EmptyState icon={AwardIcon} title="No certificates yet">
          Complete all lessons and submit every assignment in a course. Once it&apos;s checked, your certificate appears here.
        </EmptyState>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {certs.map((c) => (
            <li key={c.id} className="flex items-center gap-4 rounded-2xl border border-spark-500/50 bg-spark-500/10 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-spark-500 text-forest-900">
                <AwardIcon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-forest-950">{c.courseTitle}</span>
                <span className="block text-xs text-slate-500">
                  {c.number} · {c.createdAt ? dateFmt.format(c.createdAt.toDate()) : ""}
                </span>
              </span>
              <button type="button" onClick={() => setView(c)} className="rounded-full bg-forest-700 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-600">
                View
              </button>
            </li>
          ))}
        </ul>
      )}
      {view && <CertificateView c={view} onClose={() => setView(null)} />}
    </Card>
  );
}

// ---------------- Help & Support ----------------

export function SupportPage({ user }: { user: AppUser }) {
  return (
    <>
      <Card id="support">
        <CardTitle title="Help & Support" />
        <p className="mt-1 mb-5 text-sm text-slate-500">Raise a ticket and our team will reply here and on your email.</p>
        <SupportForm user={user} />
      </Card>
      <MyTickets user={user} />
    </>
  );
}
