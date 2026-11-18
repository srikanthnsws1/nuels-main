"use client";

import { Timestamp, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { AppUser } from "./auth";
import { db } from "./firebase";

/**
 * Resumes and job applications.
 * - The file is kept in Firestore (free plan, no Storage bucket): `resumeFiles/{uid}` holds it as a
 *   data URL, `resumes/{uid}` describes it. A Firestore document holds at most 1 MB, so the file
 *   limit is 700 KB (base64 adds a third).
 * - Applying to a job creates `jobApplications/{jobId}_{uid}` pointing at the applicant's resume.
 * Admins (and employees with "jobs.manage") read applications and resumes and set their status.
 */
export const RESUME_MAX_BYTES = 700 * 1024;
export const resumeTypes: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
};
export const resumeAccept = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type Resume = { fileName: string; size: number; contentType: string; path: string; uploadedAt?: Timestamp };

export type ApplicationStatus = "new" | "shortlisted" | "rejected" | "hired";
export const applicationStatuses: { id: ApplicationStatus; label: string; tone: string }[] = [
  { id: "new", label: "New", tone: "bg-blue-100 text-blue-800" },
  { id: "shortlisted", label: "Shortlisted", tone: "bg-amber-100 text-amber-800" },
  { id: "hired", label: "Hired", tone: "bg-spark-500/25 text-forest-800" },
  { id: "rejected", label: "Not selected", tone: "bg-slate-100 text-slate-500" },
];
export const applicationStatus = (s: string) => applicationStatuses.find((x) => x.id === s) ?? applicationStatuses[0];

export type JobApplication = {
  id: string;
  jobId: string;
  jobTitle: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  memberId?: string;
  role: string;
  resumePath: string;
  resumeName: string;
  note?: string;
  status: ApplicationStatus;
  createdAt?: Timestamp;
};

export const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Checks the file before upload; returns an error message or "". */
export function resumeProblem(file: File) {
  if (!resumeTypes[file.type] && !/\.(pdf|docx?)$/i.test(file.name)) return "Upload a PDF or Word file.";
  if (file.size > RESUME_MAX_BYTES) return `That file is ${kb(file.size)}. The limit is 700 KB: save it as a smaller PDF (fewer images) and try again.`;
  return "";
}

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
/** Some browsers send no type for Word files; go by the extension then. */
const contentTypeOf = (file: File) =>
  resumeTypes[file.type] ? file.type : /\.pdf$/i.test(file.name) ? "application/pdf" : /\.docx$/i.test(file.name) ? DOCX : "application/msword";

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/** Uploads (or replaces) the user's resume. */
export async function uploadResume(uid: string, file: File) {
  const path = `resumeFiles/${uid}`;
  const contentType = contentTypeOf(file);
  const data = `data:${contentType};base64,${await toBase64(file)}`;
  const batch = writeBatch(db);
  batch.set(doc(db, "resumeFiles", uid), { data });
  batch.set(doc(db, "resumes", uid), { fileName: file.name.slice(0, 150), size: file.size, contentType, path, uploadedAt: serverTimestamp() });
  await batch.commit();
}

export async function deleteResume(uid: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "resumeFiles", uid));
  batch.delete(doc(db, "resumes", uid));
  await batch.commit();
}

/** A link to open the file in this browser (a blob URL; browsers block opening data URLs directly). */
export async function resumeUrl(path: string) {
  const snap = await getDoc(doc(db, path));
  const data = snap.data()?.data as string | undefined;
  if (!data) throw new Error("Resume not found");
  const blob = await (await fetch(data)).blob();
  return URL.createObjectURL(blob);
}

export function useResume(uid: string | undefined) {
  const [state, setState] = useState<{ uid?: string; resume: Resume | null | undefined }>({ resume: undefined });
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "resumes", uid),
      (s) => setState({ uid, resume: s.exists() ? (s.data({ serverTimestamps: "estimate" }) as Resume) : null }),
      () => setState({ uid, resume: null }),
    );
  }, [uid]);
  return state.uid === uid ? state.resume : undefined;
}

export async function applyToJob(user: AppUser, job: { id: string; title: string }, resume: Resume, note: string) {
  await setDoc(doc(db, "jobApplications", `${job.id}_${user.uid}`), {
    jobId: job.id,
    jobTitle: job.title.slice(0, 150),
    uid: user.uid,
    name: user.name,
    email: user.email,
    ...(user.phone ? { phone: user.phone } : {}),
    ...(user.memberId ? { memberId: user.memberId } : {}),
    role: user.role,
    resumePath: resume.path,
    resumeName: resume.fileName,
    ...(note.trim() ? { note: note.trim().slice(0, 1000) } : {}),
    status: "new",
    createdAt: serverTimestamp(),
  });
}

export const setApplicationStatus = (id: string, status: ApplicationStatus) => updateDoc(doc(db, "jobApplications", id), { status, updatedAt: serverTimestamp() });

function useApplicationQuery(make: (() => ReturnType<typeof query> | ReturnType<typeof collection>) | null, key: string) {
  const [state, setState] = useState<{ key: string; rows: JobApplication[] | null; error: string }>({ key: "", rows: null, error: "" });
  useEffect(() => {
    if (!make) return;
    return onSnapshot(
      make(),
      (snap) =>
        setState({
          key,
          rows: snap.docs
            .map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: "estimate" }) as object) }) as JobApplication)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
          error: "",
        }),
      () => setState({ key, rows: [], error: "Couldn't load applications. Make sure the Firestore rules are deployed." }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` identifies the query
  }, [key]);
  return state.key === key ? state : { rows: null, error: "" };
}

/** Admin / jobs.manage: every application. */
export const useApplications = (enabled = true) => useApplicationQuery(enabled ? () => collection(db, "jobApplications") : null, enabled ? "all" : "off");
/** The jobs the signed-in user has applied to. */
export const useMyApplications = (uid: string | undefined) =>
  useApplicationQuery(uid ? () => query(collection(db, "jobApplications"), where("uid", "==", uid)) : null, uid ? `mine:${uid}` : "off");
