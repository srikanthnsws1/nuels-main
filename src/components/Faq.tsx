"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import SectionHeading from "./SectionHeading";
import { CloseIcon, MailIcon, PlusIcon, SearchIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { faqCategories, faqs, type Faq, type FaqCategory } from "@/data/site";

type Filter = "All" | FaqCategory;
const filters: Filter[] = ["All", ...faqCategories];

function FaqItem({ faq, isOpen, onToggle }: { faq: Faq; isOpen: boolean; onToggle: () => void }) {
  const id = useId();
  const content = useRef<HTMLParagraphElement>(null);
  const [height, setHeight] = useState(0);

  // Track the answer's real height so the panel can animate to it at any screen width.
  useEffect(() => {
    const el = content.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`rounded-2xl border bg-white transition-all duration-300 ${
        isOpen ? "border-forest-300 shadow-lg shadow-forest-900/5" : "border-forest-100 hover:border-forest-200"
      }`}
    >
      <h3>
        <button
          type="button"
          id={`${id}-button`}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`${id}-panel`}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-6 sm:py-5"
        >
          <span className={`font-semibold transition-colors ${isOpen ? "text-forest-700" : "text-forest-950"}`}>
            {faq.question}
          </span>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
              isOpen ? "rotate-45 bg-forest-700 text-spark-400" : "bg-forest-50 text-forest-700"
            }`}
          >
            <PlusIcon className="h-4 w-4" />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        style={{ maxHeight: isOpen ? height : 0 }}
        className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        <p ref={content} className="px-4 pb-4 text-sm leading-relaxed sm:px-6 sm:pb-5 text-slate-600">{faq.answer}</p>
      </div>
    </div>
  );
}

export default function FaqSection({ standalone = false }: { standalone?: boolean }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(faqs[0]?.question ?? null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter(
      (f) =>
        (filter === "All" || f.category === filter) &&
        (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)),
    );
  }, [filter, query]);

  const selectFilter = (f: Filter) => {
    setFilter(f);
    setOpen(faqs.find((faq) => f === "All" || faq.category === f)?.question ?? null);
  };

  return (
    <section id="faq" className="bg-forest-50/60 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 2xl:max-w-4xl">
        {!standalone && (
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently Asked Questions"
            subtitle="Got questions? We have answers. Here's everything you need to know before you start learning with Nuels."
          />
        )}

        <Reveal delay={standalone ? 0 : 250}>
          <div className={`${standalone ? "" : "mt-10"} flex items-center gap-3 rounded-full border border-forest-100 bg-white px-5 py-3 shadow-sm transition focus-within:border-forest-300`}>
            <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions..."
              aria-label="Search frequently asked questions"
              className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="rounded-full p-1 text-slate-400 hover:bg-forest-50 hover:text-forest-700"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <div role="tablist" aria-label="FAQ categories" className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1 sm:justify-center">
            {filters.map((f) => {
              const count = f === "All" ? faqs.length : faqs.filter((faq) => faq.category === f).length;
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectFilter(f)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-forest-700 text-white shadow-lg shadow-forest-700/20"
                      : "border border-forest-100 bg-white text-slate-600 hover:border-forest-300 hover:text-forest-700"
                  }`}
                >
                  {f}
                  <span
                    className={`rounded-full px-1.5 text-xs ${active ? "bg-spark-500 text-forest-900" : "bg-forest-50 text-forest-600"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-8 space-y-4">
          {visible.map((faq) => (
            <FaqItem
              key={faq.question}
              faq={faq}
              isOpen={open === faq.question}
              onToggle={() => setOpen(open === faq.question ? null : faq.question)}
            />
          ))}

          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-forest-200 bg-white px-6 py-10 text-center">
              <p className="font-semibold text-forest-900">No questions match &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-sm text-slate-500">Try a different keyword or browse another category.</p>
            </div>
          )}
        </div>

        <Reveal>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl bg-forest-700 px-6 py-5 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-semibold text-white">Still have questions?</p>
              <p className="text-sm text-forest-100">Our team usually replies within a few hours.</p>
            </div>
            <Link
              href="/contact"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-spark-500 px-5 py-2.5 text-sm font-bold text-forest-900 transition hover:bg-spark-400"
            >
              <MailIcon className="h-4 w-4" />
              Contact Support
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
