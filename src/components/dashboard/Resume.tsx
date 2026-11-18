"use client";

import { useRef, useState } from "react";
import { FileIcon, UploadIcon } from "../icons";
import Dialog from "./Dialog";
import { deleteResume, kb, resumeAccept, resumeProblem, resumeUrl, uploadResume, useResume } from "@/lib/careers";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Opens a stored resume in a new tab. */
export async function openResume(path: string) {
  // Open the tab first (inside the click) so pop-up blockers allow it, then point it at the file.
  const tab = window.open("", "_blank");
  try {
    const url = await resumeUrl(path);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    tab?.close();
    console.error("Could not open resume", err);
    window.alert("Couldn't open the resume. It may have been removed.");
  }
}

/** The user's resume: upload, replace, view or remove it. */
export function ResumeBox({ uid, compact = false }: { uid: string; compact?: boolean }) {
  const resume = useResume(uid);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [error, setError] = useState("");

  const pick = async (file?: File) => {
    if (!file) return;
    const problem = resumeProblem(file);
    if (problem) return setError(problem);
    setBusy("upload");
    setError("");
    try {
      await uploadResume(uid, file);
    } catch (err) {
      console.error("Could not upload resume", err);
      setError("Couldn't upload the file. Check your connection and try again.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove your resume? Jobs you already applied to keep a link to it only while it exists.")) return;
    setBusy("delete");
    setError("");
    try {
      await deleteResume(uid);
    } catch (err) {
      console.error("Could not remove resume", err);
      setError("Couldn't remove it. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <input ref={input} type="file" accept={resumeAccept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose resume file" data-testid="resume-input" />
      {resume === undefined ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : resume ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-forest-100 bg-forest-50/60 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-700 text-spark-400">
            <FileIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-forest-950">{resume.fileName}</span>
            <span className="block text-xs text-slate-500">
              {kb(resume.size)}
              {resume.uploadedAt && ` · uploaded ${dateFmt.format(resume.uploadedAt.toDate())}`}
            </span>
          </span>
          <span className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openResume(resume.path)} className="rounded-full border border-forest-200 bg-white px-3 py-1.5 text-xs font-semibold text-forest-700 hover:bg-forest-50">
              View
            </button>
            <button type="button" disabled={!!busy} onClick={() => input.current?.click()} className="rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-600 disabled:opacity-60">
              {busy === "upload" ? "Uploading…" : "Replace"}
            </button>
            {!compact && (
              <button type="button" disabled={!!busy} onClick={remove} className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                {busy === "delete" ? "Removing…" : "Remove"}
              </button>
            )}
          </span>
        </div>
      ) : (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-forest-200 bg-forest-50/40 px-4 py-6 text-center transition hover:border-forest-400 hover:bg-forest-50 disabled:opacity-60"
        >
          <UploadIcon className="h-6 w-6 text-forest-600" />
          <span className="text-sm font-semibold text-forest-900">{busy ? "Uploading…" : "Upload your resume"}</span>
          <span className="text-xs text-slate-500">PDF or Word, up to 700 KB</span>
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ResumeDialog({ uid, onClose }: { uid: string; onClose: () => void }) {
  return (
    <Dialog title="My resume" onClose={onClose}>
      <p className="mt-1 mb-4 text-sm text-slate-600">Keep your latest resume here and apply to Jobs at Nuel Smart with one click.</p>
      <ResumeBox uid={uid} />
      <button type="button" onClick={onClose} className="mt-6 w-full rounded-full border border-forest-200 py-3 text-sm font-semibold text-forest-700 hover:bg-forest-50">
        Done
      </button>
    </Dialog>
  );
}
