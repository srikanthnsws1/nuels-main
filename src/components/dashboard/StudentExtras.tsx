"use client";
/* eslint-disable @next/next/no-img-element -- gallery and certificate images are data URLs */

import { useEffect, useState } from "react";
import Logo from "../Logo";
import { ArrowLeftIcon, ArrowRightIcon, AwardIcon, BriefcaseIcon, CloseIcon, HelpIcon, ImageIcon, PinIcon } from "../icons";
import SupportForm from "../SupportForm";
import { Card, CardTitle, EmptyState } from "./ui";
import type { AppUser } from "@/lib/auth";
import { applyHref, galleryCategories, isNewJob, loadGalleryImage, useGallery, useJobs, useMyCertificates, type Certificate, type GalleryItem } from "@/lib/company";
import { categoryLabel, statusInfo, ticketRef, useMyTickets } from "@/lib/tickets";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

// ---------------- Jobs at Nuel Smart ----------------

export function JobsPage() {
  const { rows, error } = useJobs();
  const jobs = (rows ?? []).filter((j) => j.open && (!j.lastDate || j.lastDate >= new Date().toISOString().slice(0, 10)));
  const [open, setOpen] = useState<string | null>(null);
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
                <a href={applyHref(j)} target={applyHref(j).startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600">
                  Apply <ArrowRightIcon className="h-4 w-4" />
                </a>
              </div>
              <button type="button" onClick={() => setOpen(open === j.id ? null : j.id)} className="mt-2 text-sm font-semibold text-forest-700 hover:text-forest-500">
                {open === j.id ? "Hide details" : "View details"}
              </button>
              {open === j.id && <p className="mt-2 whitespace-pre-line rounded-xl bg-forest-50/60 p-4 text-sm leading-relaxed text-slate-700">{j.description}</p>}
            </li>
          ))}
        </ul>
      )}
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
  const { rows } = useMyTickets(user.uid);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <Card id="support">
        <CardTitle title="Help & Support" />
        <p className="mt-1 mb-5 text-sm text-slate-500">Raise a ticket and our team will reply here and on your email.</p>
        <SupportForm user={user} />
      </Card>
      <Card>
        <CardTitle title="My tickets" />
        {rows === null ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={HelpIcon} title="No tickets yet" />
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((t) => {
              const s = statusInfo(t.status);
              return (
                <li key={t.id} className="rounded-2xl border border-forest-100 p-4">
                  <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full flex-wrap items-center gap-3 text-left">
                    <span className="font-mono text-xs font-bold text-forest-700">{ticketRef(t.id)}</span>
                    <span className="min-w-0 flex-1 font-semibold text-forest-950">{categoryLabel(t.category)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
                  </button>
                  {open === t.id && (
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="whitespace-pre-line rounded-xl bg-forest-50/60 px-4 py-3 text-slate-700">{t.message}</p>
                      {t.updates?.map((u, i) => (
                        <p key={i} className="border-l-2 border-spark-500 pl-3 text-slate-700">
                          {u.text} <span className="text-xs text-slate-400">· {u.byName}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
