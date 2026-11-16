"use client";
/* eslint-disable @next/next/no-img-element -- admin previews of uploaded data-URL images */

import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeftIcon, ArrowRightIcon, LayoutIcon } from "../icons";
import { Card, CardTitle, EmptyState, SearchBox, matchesSearch } from "./ui";
import { db } from "@/lib/firebase";
import { HOME_LIMIT, builtInItems, homeCollections, type HomeKind } from "@/lib/homeContent";
import { compressImage } from "@/lib/image";

type Field = { key: string; label: string; long?: boolean; optional?: boolean; placeholder?: string };
const fields: Record<HomeKind, Field[]> = {
  categories: [
    { key: "title", label: "Category name", placeholder: "e.g. Web Development" },
    { key: "tagline", label: "Short line", placeholder: "e.g. Full-stack, React & Node.js" },
  ],
  mentors: [
    { key: "name", label: "Name" },
    { key: "role", label: "Role", placeholder: "e.g. UI/UX Design Mentor" },
    { key: "experience", label: "Experience", placeholder: "e.g. 10+ yrs" },
    { key: "company", label: "Company / background", placeholder: "e.g. Design Lead, SaaS products" },
    { key: "linkedin", label: "LinkedIn link", optional: true, placeholder: "https://linkedin.com/in/…" },
    { key: "instagram", label: "Instagram link", optional: true, placeholder: "https://instagram.com/…" },
  ],
  stories: [
    { key: "name", label: "Learner name" },
    { key: "role", label: "Role / result", placeholder: "e.g. Junior Data Analyst" },
    { key: "quote", label: "Their words", long: true },
  ],
};
const tabs: { id: HomeKind; label: string; one: string }[] = [
  { id: "categories", label: "Categories", one: "category" },
  { id: "mentors", label: "Mentors", one: "mentor" },
  { id: "stories", label: "Success stories", one: "story" },
];
const input = "w-full rounded-2xl border border-forest-100 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-forest-300";

type Row = { id: string; order: number; image: string } & Record<string, string | number>;

function useRows(kind: HomeKind) {
  const [state, setState] = useState<{ kind: HomeKind; rows: Row[] | null; error: string }>({ kind, rows: null, error: "" });
  useEffect(
    () =>
      onSnapshot(
        collection(db, homeCollections[kind]),
        (snap) => setState({ kind, rows: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Row).sort((a, b) => a.order - b.order), error: "" }),
        () => setState({ kind, rows: [], error: "Couldn't load. Make sure the Firestore rules are deployed." }),
      ),
    [kind],
  );
  return state.kind === kind ? state : { rows: null, error: "" };
}

function ItemForm({ kind, initial, nextOrder, onDone }: { kind: HomeKind; initial?: Row; nextOrder: number; onDone: () => void }) {
  const [f, setF] = useState<Record<string, string>>(() =>
    Object.fromEntries([...fields[kind].map((x) => [x.key, String(initial?.[x.key] ?? "")]), ["image", initial?.image ?? ""]]),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      setF((x) => ({ ...x, image: "" }));
      const image = await compressImage(file, { maxSide: 900 });
      setF((x) => ({ ...x, image }));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = fields[kind].find((x) => !x.optional && !f[x.key].trim());
    if (missing) return setError(`Add the ${missing.label.toLowerCase()}.`);
    if (!f.image) return setError("Add a photo.");
    for (const x of fields[kind].filter((x) => x.optional && f[x.key].trim())) {
      if (!/^https:\/\//.test(f[x.key].trim())) return setError(`${x.label} must start with https://`);
    }
    setBusy(true);
    setError("");
    const data = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    try {
      if (initial) await updateDoc(doc(db, homeCollections[kind], initial.id), { ...data, updatedAt: serverTimestamp() });
      else await addDoc(collection(db, homeCollections[kind]), { ...data, order: nextOrder, updatedAt: serverTimestamp() });
      onDone();
    } catch (err) {
      console.error("Could not save", err);
      setError("Couldn't save. The photo may be too large, or check your connection.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-4 grid gap-4 rounded-2xl bg-forest-50/60 p-4 md:grid-cols-[180px_1fr]">
      <div>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-dashed border-forest-200 bg-white">
          {f.image ? <img src={f.image} alt="" className="h-full w-full object-cover" /> : <span className="px-3 text-center text-xs text-slate-400">No photo yet</span>}
        </div>
        <label className="mt-2 block cursor-pointer rounded-full border border-forest-200 bg-white px-3 py-2 text-center text-xs font-semibold text-forest-700 hover:bg-forest-50">
          {f.image ? "Change photo" : "Upload photo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
      <div className="grid content-start gap-3 sm:grid-cols-2">
        {fields[kind].map((x) => (
          <label key={x.key} className={`block text-sm ${x.long ? "sm:col-span-2" : ""}`}>
            <span className="mb-1 block font-medium text-forest-900">
              {x.label}
              {x.optional && <span className="font-normal text-slate-400"> (optional)</span>}
            </span>
            {x.long ? (
              <textarea value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} rows={3} maxLength={300} placeholder={x.placeholder} className={`${input} resize-none`} />
            ) : (
              <input value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} maxLength={120} placeholder={x.placeholder} className={input} />
            )}
          </label>
        ))}
        {error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 sm:col-span-2">{error}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <button type="submit" disabled={busy} className="rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60">
            {busy ? "Saving…" : initial ? "Save changes" : "Add"}
          </button>
          <button type="button" onClick={onDone} className="rounded-full border border-forest-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

/** Admin: the home page's categories, mentors and success stories. The first three of each show on the home page. */
export default function AdminHomeContent() {
  const [kind, setKind] = useState<HomeKind>("categories");
  const { rows, error } = useRows(kind);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const tab = tabs.find((t) => t.id === kind)!;
  const list = rows ?? [];
  const title = (r: Record<string, unknown>) => String(r.title ?? r.name ?? "");
  const shown = list.filter((r) => matchesSearch(query, r.title, r.name, r.role, r.tagline, r.company, r.quote));

  const run = async (job: () => Promise<unknown>) => {
    setBusy(true);
    setMsg("");
    try {
      await job();
    } catch (err) {
      console.error(err);
      setMsg("Couldn't save. Check your connection and Firestore rules.");
    } finally {
      setBusy(false);
    }
  };

  const importBuiltIn = () =>
    run(async () => {
      const batch = writeBatch(db);
      (builtInItems[kind] as unknown as Record<string, string>[]).forEach((item, i) =>
        batch.set(doc(collection(db, homeCollections[kind])), { ...item, order: i, updatedAt: serverTimestamp() }),
      );
      await batch.commit();
    });

  // Moving swaps the order numbers of two neighbours.
  const move = (i: number, dir: -1 | 1) =>
    run(async () => {
      const a = list[i];
      const b = list[i + dir];
      if (!a || !b) return;
      const batch = writeBatch(db);
      batch.update(doc(db, homeCollections[kind], a.id), { order: b.order === a.order ? a.order + dir : b.order });
      batch.update(doc(db, homeCollections[kind], b.id), { order: a.order });
      await batch.commit();
    });

  const remove = (r: Row) => {
    if (!window.confirm(`Delete ${title(r)}? It disappears from the website.`)) return;
    run(() => deleteDoc(doc(db, homeCollections[kind], r.id)));
  };

  return (
    <Card>
      <CardTitle
        title="Website content"
        action={
          rows && rows.length > 0 && editing === null ? (
            <button type="button" onClick={() => setEditing("new")} className="rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-forest-600">
              + Add {tab.one}
            </button>
          ) : undefined
        }
      />
      <p className="mt-1 text-sm text-slate-500">
        The first {HOME_LIMIT} of each list show on the home page; the full list shows on its own page. Courses are managed under Courses.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={kind === t.id}
              onClick={() => {
                setKind(t.id);
                setEditing(null);
                setQuery("");
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${kind === t.id ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder={`Search ${tab.label.toLowerCase()}`} className="sm:w-64" />
      </div>
      {(error || msg) && <p className="mt-4 text-sm font-medium text-red-600">{error || msg}</p>}

      {editing === "new" && <ItemForm kind={kind} nextOrder={(list[list.length - 1]?.order ?? -1) + 1} onDone={() => setEditing(null)} />}

      {rows === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-forest-200 p-6 text-center">
          <LayoutIcon className="mx-auto h-8 w-8 text-forest-400" />
          <p className="mt-2 font-semibold text-forest-950">The website shows the {builtInItems[kind].length} built-in {tab.label.toLowerCase()}</p>
          <p className="mt-1 text-sm text-slate-500">Copy them here to edit, reorder, delete or add your own.</p>
          <button type="button" disabled={busy} onClick={importBuiltIn} className="mt-4 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60">
            {busy ? "Copying…" : `Copy the built-in ${tab.label.toLowerCase()} to edit`}
          </button>
        </div>
      ) : shown.length === 0 ? (
        <EmptyState icon={LayoutIcon} title="Nothing matches" />
      ) : (
        <ul className="mt-5 space-y-3">
          {shown.map((r) => {
            const i = list.indexOf(r);
            return (
              <li key={r.id} className="rounded-2xl border border-forest-100 p-3">
                <div className="flex flex-wrap items-center gap-4">
                  <img src={r.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-forest-950">
                      {title(r)}
                      {i < HOME_LIMIT && <span className="ml-2 rounded-full bg-spark-500/25 px-2 py-0.5 text-[11px] font-bold text-forest-800">On home page</span>}
                    </p>
                    <p className="line-clamp-2 text-sm text-slate-500">{String(r.tagline ?? r.role ?? "")}{r.quote ? ` · “${r.quote}”` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-100 text-forest-700 hover:bg-forest-50 disabled:opacity-30">
                      <ArrowLeftIcon className="h-4 w-4 rotate-90" />
                    </button>
                    <button type="button" disabled={busy || i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-100 text-forest-700 hover:bg-forest-50 disabled:opacity-30">
                      <ArrowRightIcon className="h-4 w-4 rotate-90" />
                    </button>
                    <button type="button" onClick={() => setEditing(editing === r.id ? null : r.id)} className="rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold text-forest-700 hover:bg-forest-50">
                      Edit
                    </button>
                    <button type="button" disabled={busy} onClick={() => remove(r)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
                {editing === r.id && <ItemForm kind={kind} initial={r} nextOrder={r.order} onDone={() => setEditing(null)} />}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
