"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightIcon, BookIcon, CalendarIcon, CartIcon, CheckIcon, ClockIcon, CloseIcon, PlayIcon, StarIcon, UsersIcon } from "./icons";
import MarksWeightage from "./MarksWeightage";
import Reveal from "./motion/Reveal";
import { highWeightage, percentOf, unitFor } from "@/data/class10Maths";
import { useAuth } from "@/lib/auth";
import { learnHref, subjectGroups, useCatalogLoaded, useSubjectChapters, syllabusFor, type CatalogCourse } from "@/lib/catalog";
import { addManyToCart, awaitingConfirmation, cancelOrder, needsScreenshot, useMyOrders, type Order } from "@/lib/orders";

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const features = [
  "Complete chapter coverage",
  "Concepts, formulas & tricks",
  "Solved examples & practice",
  "Doubt clearing sessions",
  "Exam-oriented preparation",
];

/** Pick chapters of a school subject and add them to the cart together. */
export default function SubjectChapters({ group }: { group: string }) {
  const subject = subjectGroups[group];
  const router = useRouter();
  const { user, ready } = useAuth();
  const orders = useMyOrders(user?.uid);
  const chapters = useSubjectChapters(group);
  const loaded = useCatalogLoaded();
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  // An unpaid order locks its chapters; let the learner drop it here to pick chapters again.
  const cancelUnpaid = async (order: Order) => {
    const titles = chapters.filter((c) => order.courses.includes(c.slug)).map((c) => `Chapter ${c.chapterNo}`);
    const what = titles.length > 1 ? `${titles.join(", ")} (one order)` : titles[0] ?? "this chapter";
    if (!window.confirm(`Cancel your unpaid order for ${what}? You can choose these chapters again afterwards.`)) return;
    setCancelling(order.id);
    setError("");
    try {
      await cancelOrder(order.id);
    } catch (err) {
      console.error("Could not cancel order", err);
      setError("Couldn't cancel the order. Please try again.");
    } finally {
      setCancelling(null);
    }
  };

  const pendingOrder = (slug: string) => orders?.find((o) => awaitingConfirmation(o) && o.courses.includes(slug));
  const status = (c: CatalogCourse) =>
    user?.enrolledCourses.includes(c.slug) ? "enrolled" : pendingOrder(c.slug) ? "pending" : user?.cart.includes(c.slug) ? "cart" : "open";
  const available = chapters.filter((c) => status(c) === "open");
  const chosen = chapters.filter((c) => selected.includes(c.slug) && status(c) === "open");
  const total = chosen.reduce((s, c) => s + c.price, 0);
  const savings = chosen.reduce((s, c) => s + Math.max(0, c.oldPrice - c.price), 0);
  const perChapter = chapters[0];

  const toggle = (slug: string) => setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  const allChosen = available.length > 0 && available.every((c) => selected.includes(c.slug));

  const addToCart = async () => {
    if (!user || !chosen.length) return;
    setAdding(true);
    setError("");
    try {
      await addManyToCart(user.uid, chosen.map((c) => c.slug));
      router.push("/cart");
    } catch (err) {
      console.error("Could not add chapters to cart", err);
      setError("Couldn't add the chapters. Please check your connection and try again.");
      setAdding(false);
    }
  };

  // Chapters grouped by syllabus unit, in chapter order.
  const units: { name: string; chapters: CatalogCourse[] }[] = [];
  for (const c of chapters) {
    const name = c.unit || "Chapters";
    const last = units[units.length - 1];
    if (last?.name === name) last.chapters.push(c);
    else units.push({ name, chapters: [c] });
  }

  return (
    <>
      {/* header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-50 via-white to-white pb-10 pt-28 sm:pt-36">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_380px] lg:items-center lg:px-8">
          <div>
            <Reveal immediate variant="fade">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Link href="/" className="-my-2 py-2 hover:text-forest-700">
                  Home
                </Link>
                <span className="h-1 w-1 rounded-full bg-spark-500" />
                <Link href="/courses" className="-my-2 py-2 hover:text-forest-700">
                  Courses
                </Link>
                <span className="h-1 w-1 rounded-full bg-spark-500" />
                <span className="font-medium text-forest-700">School</span>
              </nav>
            </Reveal>
            <Reveal immediate delay={100}>
              <h1 className="mt-5 text-[2rem] font-bold leading-tight tracking-tight text-forest-950 sm:text-5xl">
                {subject.title} <span className="text-forest-600">chapter-wise classes</span>
              </h1>
            </Reveal>
            <Reveal immediate delay={200}>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{subject.description}</p>
            </Reveal>
            <Reveal immediate delay={300}>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-forest-900">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-700 text-spark-400">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 font-semibold text-red-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Live daily classes on Google Meet
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-forest-50 px-4 py-2 font-semibold text-forest-800">
                  <PlayIcon className="h-4 w-4" /> Recordings on YouTube
                </span>
              </div>
              {perChapter && (
                <p className="mt-6 flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-bold text-forest-950">{rupee.format(perChapter.price)}</span>
                  <span className="text-lg text-slate-400 line-through">{rupee.format(perChapter.oldPrice)}</span>
                  <span className="text-sm font-semibold text-forest-700">per chapter</span>
                </p>
              )}
            </Reveal>
          </div>
          <Reveal immediate variant="scale" delay={200} className="mx-auto w-full max-w-sm lg:max-w-none">
            <Image src={subject.poster} alt={`${subject.title} chapter-wise classes poster`} width={900} height={985} priority className="h-auto w-full rounded-3xl shadow-xl shadow-forest-900/10" />
          </Reveal>
        </div>
      </section>

      {group === "class-10-maths" && <MarksWeightage chapterCount={(roman) => chapters.filter((c) => unitFor(c.unit)?.roman === roman).length} />}

      {/* chapter picker */}
      <section className="mx-auto max-w-5xl px-4 pb-32 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">Choose your chapters</h2>
            <p className="mt-1 text-sm text-slate-600">Tick the chapters you need. Each chapter you buy unlocks its live classes and recordings.</p>
          </div>
          {available.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(allChosen ? [] : available.map((c) => c.slug))}
              className="rounded-full border border-forest-200 px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
            >
              {allChosen ? "Clear selection" : `Select all ${available.length}`}
            </button>
          )}
        </div>

        {!loaded ? (
          <p className="mt-8 text-sm text-slate-500">Loading chapters…</p>
        ) : chapters.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Chapters will be available soon.</p>
        ) : (
          <div className="mt-8 space-y-8">
            {units.map((u) => (
              <div key={u.name}>
                <UnitHeading name={u.name} />
                <ul className="mt-3 space-y-3">
                  {u.chapters.map((c) => {
                    const st = status(c);
                    const topics = syllabusFor(c).flatMap((m) => m.topics);
                    const checked = selected.includes(c.slug) && st === "open";
                    const order = st === "pending" ? pendingOrder(c.slug) : undefined;
                    return (
                      <li
                        key={c.slug}
                        id={c.slug}
                        className={`scroll-mt-28 rounded-2xl border bg-white p-4 transition sm:p-5 ${
                          checked ? "border-forest-700 ring-2 ring-forest-700/15" : "border-forest-100"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <label className={`flex min-w-0 flex-1 items-start gap-3 ${st === "open" ? "cursor-pointer" : ""}`}>
                            {st === "open" ? (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(c.slug)}
                                className="mt-1 h-5 w-5 shrink-0 rounded accent-forest-700"
                              />
                            ) : st === "enrolled" ? (
                              <span title="Enrolled" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-spark-400">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : st === "pending" && order?.status === "rejected" ? (
                              <span title="Payment rejected" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                                <CloseIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : st === "pending" ? (
                              <span title="Waiting for payment" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                <ClockIcon className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span title="In your cart" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                                <CartIcon className="h-3.5 w-3.5" />
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block font-semibold text-forest-950">
                                Chapter {c.chapterNo}: {c.title.replace(/^Class 10 Maths – /, "")}
                              </span>
                              <span className="mt-1 block text-sm leading-relaxed text-slate-600">{topics.join(" · ")}</span>
                              {st === "pending" && (
                                <span className={`mt-2 block text-xs font-semibold ${order?.status === "rejected" ? "text-red-600" : "text-amber-700"}`}>
                                  {order?.status === "rejected"
                                    ? "Your payment screenshot wasn't approved. Upload a new one from your cart."
                                    : order && needsScreenshot(order)
                                      ? "You've ordered this chapter but haven't paid yet. Pay and upload the screenshot to unlock it, or cancel the order from your cart."
                                      : "Payment screenshot received. The chapter unlocks once it's approved."}
                                </span>
                              )}
                            </span>
                          </label>
                          <div className="flex shrink-0 items-center gap-3 pl-8 sm:pl-0 sm:text-right">
                            {st === "enrolled" ? (
                              <Link href={learnHref(c.slug)} className="inline-flex items-center gap-1.5 rounded-full bg-spark-500 px-4 py-2 text-sm font-bold text-forest-900 hover:bg-spark-400">
                                Enrolled · Open <ArrowRightIcon className="h-4 w-4" />
                              </Link>
                            ) : st === "pending" ? (
                              order?.status === "rejected" ? (
                                <Link href="/cart#orders" className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                                  Payment rejected · Upload again →
                                </Link>
                              ) : order && needsScreenshot(order) ? (
                                <span className="flex flex-col items-start gap-1.5 sm:items-end">
                                  <Link href="/cart#orders" className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-forest-950 hover:bg-amber-300">
                                    Payment pending · Pay now →
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => cancelUnpaid(order)}
                                    disabled={cancelling === order.id}
                                    className="px-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                                  >
                                    {cancelling === order.id ? "Cancelling…" : "Cancel order"}
                                  </button>
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">Under review</span>
                              )
                            ) : st === "cart" ? (
                              <Link href="/cart" className="inline-flex items-center gap-1.5 rounded-full border border-forest-200 px-4 py-2 text-sm font-semibold text-forest-700">
                                <CartIcon className="h-4 w-4" /> In cart
                              </Link>
                            ) : (
                              <span>
                                <span className="block text-lg font-bold text-forest-950">{rupee.format(c.price)}</span>
                                <span className="text-sm text-slate-400 line-through">{rupee.format(c.oldPrice)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-4 rounded-3xl bg-forest-50/70 p-5 text-sm text-slate-700 sm:grid-cols-3">
          <p className="flex items-start gap-2.5">
            <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" /> Join each chapter&apos;s live class on Google Meet from your course page.
          </p>
          <p className="flex items-start gap-2.5">
            <PlayIcon className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" /> Missed a class? Watch the recording on YouTube anytime.
          </p>
          <p className="flex items-start gap-2.5">
            <UsersIcon className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" /> Ask doubts in the live sessions and get exam-focused practice.
          </p>
        </div>
      </section>

      {/* selection summary */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-forest-100 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(5,26,21,0.08)] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            {chosen.length ? (
              <>
                <span className="font-bold text-forest-950">
                  {chosen.length} chapter{chosen.length === 1 ? "" : "s"} · {rupee.format(total)}
                </span>
                {savings > 0 && <span className="ml-2 font-semibold text-forest-600">You save {rupee.format(savings)}</span>}
              </>
            ) : (
              <span className="text-slate-500">
                <BookIcon className="mr-1.5 inline h-4 w-4" /> Select chapters to see your total
              </span>
            )}
            {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
          </div>
          {ready && !user ? (
            <div className="flex gap-2">
              <Link href="/login" className="rounded-full border border-forest-200 px-5 py-2.5 text-sm font-semibold text-forest-700">
                Log in
              </Link>
              <Link href="/register" className="rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white">
                Register to enroll
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={addToCart}
              disabled={!chosen.length || adding}
              className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-50"
            >
              <CartIcon className="h-4 w-4" /> {adding ? "Adding…" : "Add to cart & checkout"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** "UNIT II: ALGEBRA · 20 marks (25%) · High weightage" */
function UnitHeading({ name }: { name: string }) {
  const unit = unitFor(name);
  const high = unit && highWeightage.has(unit.roman);
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-forest-600">{name}</span>
      {unit && (
        <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-semibold text-forest-800">
          {unit.marks} marks · {percentOf(unit.marks)}
        </span>
      )}
      {high && (
        <span className="inline-flex items-center gap-1 rounded-full bg-spark-500 px-2.5 py-0.5 text-xs font-bold text-forest-900">
          <StarIcon className="h-3 w-3" /> High weightage
        </span>
      )}
    </p>
  );
}
