"use client";

import Image from "next/image";
import { useId, useRef, useState, type FormEvent } from "react";
import { BookIcon, PlusIcon } from "../icons";
import Dialog from "./Dialog";
import { Card, CardTitle, rupee } from "./ui";
import { categories, courseFilters, courses as builtIn, mentors } from "@/data/site";
import { builtInSlugs, levels, saveCourse, setCourseHidden, slugify, syllabusFor, useCatalog, type CatalogCourse } from "@/lib/catalog";
import { compressImage } from "@/lib/image";

const courseCategories = courseFilters.slice(1);
const stockImages = [
  ...builtIn.map((c) => ({ label: `Course: ${c.title}`, src: c.image })),
  ...categories.map((c) => ({ label: `Category: ${c.title}`, src: c.image })),
];

const input =
  "w-full rounded-2xl border border-forest-100 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";
const label = "mb-1.5 block text-sm font-medium text-forest-900";

type Draft = {
  title: string;
  category: string;
  mentor: string;
  level: CatalogCourse["level"];
  price: string;
  oldPrice: string;
  lessons: string;
  hours: string;
  description: string;
  image: string;
  hidden: boolean;
  modules: { title: string; topics: string }[];
};

function toDraft(c?: CatalogCourse): Draft {
  return {
    title: c?.title ?? "",
    category: c?.category ?? courseCategories[0],
    mentor: c?.mentor ?? "",
    level: c?.level ?? "Beginner",
    price: c ? String(c.price) : "",
    oldPrice: c ? String(c.oldPrice) : "",
    lessons: c ? String(c.lessons) : "",
    hours: c ? String(c.hours) : "",
    description: c?.description ?? "",
    image: c?.image ?? builtIn[0].image,
    hidden: !!c?.hidden,
    modules: syllabusFor(c).map((m) => ({ title: m.title, topics: m.topics.join("\n") })),
  };
}

function CourseEditor({ course, mentorNames, onClose }: { course?: CatalogCourse; mentorNames: string[]; onClose: () => void }) {
  const id = useId();
  const catalog = useCatalog(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<Draft>(() => toDraft(course));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const slug = course?.slug ?? slugify(d.title);
  const imageOptions = stockImages.some((i) => i.src === d.image) ? stockImages : [{ label: "Uploaded image", src: d.image }, ...stockImages];
  const mentorOptions = d.mentor && !mentorNames.includes(d.mentor) ? [d.mentor, ...mentorNames] : mentorNames;
  const syllabusChanged = JSON.stringify(d.modules) !== JSON.stringify(toDraft(course).modules);

  const setModule = (i: number, k: "title" | "topics", v: string) =>
    setD((x) => ({ ...x, modules: x.modules.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      set("image", await compressImage(file, { maxSide: 1000 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that image.");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const price = Number(d.price);
    const oldPrice = d.oldPrice ? Number(d.oldPrice) : price;
    if (d.title.trim().length < 3) return setError("Enter the course title.");
    if (!slug) return setError("The title needs some letters or numbers.");
    if (!course && catalog.some((c) => c.slug === slug)) return setError("A course with this title already exists.");
    if (!d.mentor) return setError("Choose a mentor.");
    if (!(price > 0)) return setError("Enter a price above ₹0.");
    if (!(oldPrice >= price)) return setError("The original price must be at least the selling price.");
    const modules = d.modules
      .map((m) => ({ title: m.title.trim(), topics: m.topics.split("\n").map((t) => t.trim()).filter(Boolean) }))
      .filter((m) => m.title && m.topics.length);
    if (!course && !modules.length) return setError("Add at least one module with lessons, so students have something to learn.");

    setSaving(true);
    setError("");
    try {
      await saveCourse(slug, {
        title: d.title.trim(),
        description: d.description.trim(),
        mentor: d.mentor,
        category: d.category,
        level: d.level,
        lessons: Number(d.lessons) || modules.reduce((n, m) => n + m.topics.length, 0),
        hours: Number(d.hours) || 0,
        price,
        oldPrice,
        image: d.image,
        hidden: d.hidden,
        // Built-in courses keep their original syllabus unless it was edited.
        ...(course && builtInSlugs.has(course.slug) && !syllabusChanged && !course.modules ? {} : { modules }),
      });
      onClose();
    } catch (err) {
      console.error("Could not save course", err);
      setError("Couldn't save the course. Check your connection and Firestore rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={course ? `Edit ${course.title}` : "Add a new course"} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-title`} className={label}>
              Course title
            </label>
            <input id={`${id}-title`} value={d.title} onChange={(e) => set("title", e.target.value)} className={input} />
            {!course && slug && <p className="mt-1 text-xs text-slate-500">Course link: /{slug}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-category`} className={label}>
              Category
            </label>
            <select id={`${id}-category`} value={d.category} onChange={(e) => set("category", e.target.value)} className={input}>
              {courseCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-mentor`} className={label}>
              Mentor
            </label>
            <select id={`${id}-mentor`} value={d.mentor} onChange={(e) => set("mentor", e.target.value)} className={input}>
              <option value="">Choose a mentor…</option>
              {mentorOptions.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-level`} className={label}>
              Level
            </label>
            <select id={`${id}-level`} value={d.level} onChange={(e) => set("level", e.target.value as Draft["level"])} className={input}>
              {levels.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-status`} className={label}>
              Status
            </label>
            <select id={`${id}-status`} value={d.hidden ? "hidden" : "live"} onChange={(e) => set("hidden", e.target.value === "hidden")} className={input}>
              <option value="live">Live: listed and open for enrollment</option>
              <option value="hidden">Hidden: not listed, enrollment closed</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-price`} className={label}>
              Selling price (₹)
            </label>
            <input id={`${id}-price`} type="number" min={1} value={d.price} onChange={(e) => set("price", e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-old`} className={label}>
              Original price (₹) <span className="font-normal text-slate-400">shown struck through</span>
            </label>
            <input id={`${id}-old`} type="number" min={1} value={d.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-lessons`} className={label}>
              Lessons <span className="font-normal text-slate-400">(blank = count from syllabus)</span>
            </label>
            <input id={`${id}-lessons`} type="number" min={0} value={d.lessons} onChange={(e) => set("lessons", e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-hours`} className={label}>
              Hours of content
            </label>
            <input id={`${id}-hours`} type="number" min={0} value={d.hours} onChange={(e) => set("hours", e.target.value)} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-desc`} className={label}>
              Short description
            </label>
            <textarea id={`${id}-desc`} rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-image`} className={label}>
              Course image
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-forest-100 sm:w-40">
                <Image src={d.image} alt="" fill sizes="160px" className="object-cover" />
              </div>
              <div className="flex-1 space-y-2">
                <select id={`${id}-image`} value={d.image} onChange={(e) => set("image", e.target.value)} className={input}>
                  {imageOptions.map((i) => (
                    <option key={i.src} value={i.src}>
                      {i.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-forest-700 hover:text-forest-500">
                  Upload a new image…
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-forest-950">Syllabus</p>
            <button
              type="button"
              onClick={() => set("modules", [...d.modules, { title: "", topics: "" }])}
              className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-500"
            >
              <PlusIcon className="h-4 w-4" /> Add module
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Each line under a module becomes one lesson (with its own video slot) in the student&apos;s course view.</p>
          <ol className="mt-3 space-y-3">
            {d.modules.map((m, i) => (
              <li key={i} className="rounded-2xl border border-forest-100 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-forest-700">{i + 1}.</span>
                  <input
                    value={m.title}
                    onChange={(e) => setModule(i, "title", e.target.value)}
                    placeholder="Module title"
                    aria-label={`Module ${i + 1} title`}
                    className={input}
                  />
                  <button
                    type="button"
                    onClick={() => set("modules", d.modules.filter((_, j) => j !== i))}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={m.topics}
                  onChange={(e) => setModule(i, "topics", e.target.value)}
                  rows={3}
                  placeholder={"Lesson 1\nLesson 2\nLesson 3"}
                  aria-label={`Module ${i + 1} lessons, one per line`}
                  className={`${input} mt-2`}
                />
              </li>
            ))}
          </ol>
          {course && syllabusChanged && (
            <p className="mt-2 text-xs text-amber-700">
              Lessons are matched by position, so renaming keeps students&apos; progress and videos, but removing or reordering lessons moves them.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-forest-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-60"
          >
            {saving ? "Saving…" : course ? "Save changes" : "Add course"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** The course catalog with add, edit and hide. `extraMentors` are tutor accounts to offer as mentors. */
export function CoursesCard({ extraMentors = [] }: { extraMentors?: string[] }) {
  const catalog = useCatalog(true);
  const [editing, setEditing] = useState<CatalogCourse | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const mentorNames = [...new Set([...mentors.map((m) => m.name), ...extraMentors])].sort();

  const toggle = async (c: CatalogCourse) => {
    setBusy(c.slug);
    await setCourseHidden(c.slug, !c.hidden).catch((err) => console.error(err));
    setBusy(null);
  };

  return (
    <Card id="courses">
      <CardTitle
        title="Courses"
        action={
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-forest-700/20 transition hover:bg-forest-600"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add course
          </button>
        }
      />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-3 font-semibold">Course</th>
              <th className="pb-3 font-semibold">Mentor</th>
              <th className="pb-3 font-semibold">Level</th>
              <th className="pb-3 font-semibold">Lessons</th>
              <th className="pb-3 font-semibold">Price</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100">
            {catalog.map((c) => (
              <tr key={c.slug} className={c.hidden ? "opacity-60" : ""}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <span className="relative hidden h-10 w-16 shrink-0 overflow-hidden rounded-lg sm:block">
                      <Image src={c.image} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <span>
                      <span className="block font-semibold text-forest-950">{c.title}</span>
                      <span className="block text-xs text-slate-500">{c.category}</span>
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-600">{c.mentor || "—"}</td>
                <td className="py-3 pr-4 text-slate-600">{c.level}</td>
                <td className="py-3 pr-4 text-slate-600">{c.lessons}</td>
                <td className="py-3 pr-4 font-semibold text-forest-700">
                  {rupee.format(c.price)}
                  {c.oldPrice > c.price && <span className="ml-1.5 text-xs font-normal text-slate-400 line-through">{rupee.format(c.oldPrice)}</span>}
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.hidden ? "bg-slate-100 text-slate-500" : "bg-spark-500/25 text-forest-800"}`}>
                    {c.hidden ? "Hidden" : "Live"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="rounded-full bg-forest-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-forest-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(c)}
                      disabled={busy === c.slug}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-forest-50 disabled:opacity-50"
                    >
                      {c.hidden ? "Show" : "Hide"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {catalog.length === 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <BookIcon className="h-4 w-4" /> No courses yet.
        </p>
      )}
      {editing && <CourseEditor course={editing === "new" ? undefined : editing} mentorNames={mentorNames} onClose={() => setEditing(null)} />}
    </Card>
  );
}
