import type { Metadata } from "next";
import Link from "next/link";
import Cta from "@/components/Cta";
import PageHero from "@/components/PageHero";
import { ArrowRightIcon, CheckIcon, CloseIcon } from "@/components/icons";
import Reveal from "@/components/motion/Reveal";
import { courses } from "@/data/site";
import { absoluteUrl, breadcrumbSchema, JsonLd, pageMetadata, site } from "@/lib/seo";

const path = "/compare/mentor-led-vs-self-paced-courses";
const updated = "2026-10-18";
const updatedLabel = "18 October 2026";

export const metadata: Metadata = pageMetadata({
  title: "Mentor-Led vs Self-Paced vs Bootcamp Courses (2026)",
  path,
  description:
    "Should you learn with a mentor, a self-paced course like Udemy, or a bootcamp or degree program like Scaler or upGrad? An honest comparison of cost, support, time and outcomes.",
  keywords: [
    "mentor-led vs self-paced courses",
    "Udemy alternatives India",
    "online course with mentor",
    "bootcamp vs online course",
    "best way to learn online India",
  ],
});

const formats = [
  {
    name: "Self-paced course marketplaces",
    examples: "e.g. Udemy",
    href: "https://www.udemy.com/",
    summary: "Pre-recorded video courses from many independent instructors. You buy a course and watch it whenever you like.",
    pros: ["Lowest cost per course; frequent discounts", "Huge choice of topics", "Learn completely on your own schedule"],
    cons: ["Quality varies from course to course", "Little or no personal feedback on your work", "Easy to lose momentum without accountability"],
    bestFor: "Disciplined learners who need a specific skill quickly and on a small budget.",
  },
  {
    name: "Mentor-led online courses",
    examples: "e.g. Nuels",
    href: "/courses",
    summary: "Recorded lessons you take at your own pace, plus a named mentor who runs live sessions and reviews your projects.",
    pros: ["Feedback on your actual work from a practitioner", "Structure and accountability without a full-time schedule", "Priced well below long bootcamps"],
    cons: ["Fewer topics than a large marketplace", "Live sessions run on a weekly timetable", "Shorter than a degree; no university credential"],
    bestFor: "Beginners and career-switchers who want guidance and a portfolio without quitting their job or paying bootcamp fees.",
    ours: true,
  },
  {
    name: "Bootcamps & degree programs",
    examples: "e.g. Scaler, upGrad",
    href: "https://www.scaler.com/",
    href2: "https://www.upgrad.com/",
    summary: "Long, structured programs with live classes, cohorts and career services. Some are run with universities and award certificates or degrees.",
    pros: ["Deep, structured curriculum over many months", "Live classes and cohort community", "Career services; some offer university credentials"],
    cons: ["Significantly higher fees", "Large weekly time commitment", "Fixed batch start dates"],
    bestFor: "Learners who can commit months of time and budget for an intensive, credential-led path.",
  },
];

type Cell = boolean | string;
const rows: { label: string; values: [Cell, Cell, Cell] }[] = [
  { label: "Learning style", values: ["Recorded video", "Recorded lessons + weekly live sessions", "Mostly live classes"] },
  { label: "Personal mentor who reviews your projects", values: [false, true, "Varies by program"] },
  { label: "Learn at your own pace", values: [true, true, false] },
  { label: "Live doubt-clearing sessions", values: [false, true, true] },
  { label: "Typical length", values: ["Hours to weeks", "14–52 hours of content", "Several months to 2+ years"] },
  { label: "Price", values: ["Varies by course", "₹1,499 – ₹3,999 per course", "Check the provider; varies by program"] },
  { label: "Certificate", values: ["Certificate of completion", "Certificate of completion", "Certificate, diploma or degree (varies)"] },
  { label: "Refund policy", values: ["See provider terms", "Full refund within 7 days if under 25% completed", "See provider terms"] },
];

const checklist = [
  "Who exactly will teach me, and what have they built or done in this field?",
  "Will someone review my projects and tell me how to improve them?",
  "How many hours per week does it really take, and is the schedule fixed?",
  "What is the total cost, including taxes, EMI interest or extra fees?",
  "What is the refund policy, in writing?",
  "Can I see the full syllabus and a sample lesson before paying?",
];

const faqs = [
  {
    question: "Is a mentor-led course better than Udemy?",
    answer:
      "It depends on how you learn. Self-paced courses on marketplaces like Udemy are cheaper and work well if you are disciplined and only need a specific skill. A mentor-led course costs more but adds live sessions and personal feedback on your projects, which helps most beginners finish and build a portfolio.",
  },
  {
    question: "Do I need an expensive bootcamp to change careers?",
    answer:
      "Not always. Bootcamps and degree programs offer depth, cohorts and sometimes university credentials, but they cost significantly more and take months. Many learners build job-ready skills with a focused mentor-led course plus consistent practice. Choose a bootcamp if you need the credential or the intensive structure.",
  },
  {
    question: "How do I choose the right online course format?",
    answer:
      "Start with your goal, budget and weekly time. If you need a quick skill and are self-motivated, choose self-paced. If you want guidance and feedback while working or studying, choose mentor-led. If you can commit months and want a credential, consider a bootcamp or degree program.",
  },
];

function Value({ v }: { v: Cell }) {
  if (v === true)
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-forest-700">
        <CheckIcon className="h-4 w-4" /> Yes
      </span>
    );
  if (v === false)
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <CloseIcon className="h-4 w-4" /> No
      </span>
    );
  return <span className="text-slate-700">{v}</span>;
}

export default function ComparePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Mentor-Led vs Self-Paced vs Bootcamp Courses: Which Should You Choose?",
            description: "An honest comparison of online course formats in India: self-paced marketplaces, mentor-led courses and bootcamps or degree programs.",
            url: absoluteUrl(path),
            datePublished: updated,
            dateModified: updated,
            author: { "@type": "Organization", name: site.name, url: absoluteUrl("/") },
            publisher: { "@id": `${absoluteUrl("/")}/#organization` },
            image: absoluteUrl(site.ogImage.url),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
          },
          breadcrumbSchema([{ name: "Compare course formats", path }]),
        ]}
      />

      <PageHero
        eyebrow="Compare"
        title="Mentor-Led vs Self-Paced vs"
        highlight="Bootcamp Courses"
        subtitle="An honest guide to choosing how to learn online in India, based on your goal, budget and the time you really have."
      >
        <p className="mt-6 text-xs text-slate-500">
          Last updated {updatedLabel} · Written by the {site.name} team. We run mentor-led courses, so we&apos;ve tried to be fair and say when another format suits you better.
        </p>
      </PageHero>

      <article className="mx-auto max-w-5xl px-4 pb-6 sm:px-6 lg:px-8">
        {/* quick answer */}
        <Reveal>
          <section className="rounded-3xl bg-forest-700 p-6 sm:p-8" aria-labelledby="quick">
            <h2 id="quick" className="text-xl font-bold text-white sm:text-2xl">
              The short answer
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-forest-100 sm:text-base">
              <li>
                <strong className="text-spark-400">Choose self-paced</strong> if you are self-motivated, need one specific skill and want the lowest cost.
              </li>
              <li>
                <strong className="text-spark-400">Choose mentor-led</strong> if you are a beginner or switching careers and want feedback on your work while keeping your job or studies.
              </li>
              <li>
                <strong className="text-spark-400">Choose a bootcamp or degree</strong> if you can invest months and a larger budget, and a formal credential matters for your goal.
              </li>
            </ul>
          </section>
        </Reveal>

        {/* formats */}
        <section className="mt-16" aria-labelledby="formats">
          <h2 id="formats" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
            The three ways to learn online
          </h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Most online courses in India fall into one of three formats. They differ less in what they teach and more in how much support you get, how long they take and what they cost.
          </p>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {formats.map((f, i) => (
              <Reveal key={f.name} delay={i * 100} className="h-full">
                <div className={`flex h-full flex-col rounded-3xl border p-6 ${f.ours ? "border-forest-700 bg-forest-50/70 ring-2 ring-forest-700/10" : "border-forest-100 bg-white"}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-forest-600">{f.examples}</p>
                  <h3 className="mt-1 text-lg font-bold text-forest-950">{f.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.summary}</p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-forest-700">Strengths</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {f.pros.map((p) => (
                      <li key={p} className="flex gap-2">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Trade-offs</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {f.cons.map((c) => (
                      <li key={c} className="flex gap-2">
                        <CloseIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        {c}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto pt-6 text-sm text-forest-900">
                    <strong>Best for:</strong> {f.bestFor}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* table */}
        <section className="mt-16" aria-labelledby="table">
          <h2 id="table" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
            Side-by-side comparison
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Formats compared as of {updatedLabel}. Competitor details are general to each format; check each provider&apos;s website for current prices and terms.
          </p>
          <div className="no-scrollbar mt-6 overflow-x-auto rounded-3xl border border-forest-100" data-lenis-prevent>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-forest-50 text-forest-900">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    &nbsp;
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    Self-paced <span className="block text-xs font-normal text-slate-500">e.g. Udemy</span>
                  </th>
                  <th scope="col" className="bg-forest-700 px-5 py-4 font-semibold text-white">
                    Mentor-led <span className="block text-xs font-normal text-spark-400">Nuels</span>
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    Bootcamp / degree <span className="block text-xs font-normal text-slate-500">e.g. Scaler, upGrad</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-forest-100">
                    <th scope="row" className="px-5 py-4 font-medium text-forest-950">
                      {r.label}
                    </th>
                    {r.values.map((v, i) => (
                      <td key={i} className={`px-5 py-4 ${i === 1 ? "bg-forest-50/60" : ""}`}>
                        <Value v={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600"
            >
              See Nuels mentor-led courses <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* how to choose */}
        <section className="mt-16 grid gap-10 lg:grid-cols-2" aria-labelledby="choose">
          <div>
            <h2 id="choose" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              How to choose the right format
            </h2>
            <div className="mt-5 space-y-4 text-slate-600">
              <p>
                <strong className="text-forest-950">Start with your goal.</strong> Learning one tool for your current job is very different from switching careers. A short self-paced course is often enough for the first; the second usually needs projects, feedback and a portfolio.
              </p>
              <p>
                <strong className="text-forest-950">Be honest about your time.</strong> If you work or study full time, a format with fixed daily classes is hard to sustain. Self-paced lessons with a weekly live session are easier to fit around a busy week.
              </p>
              <p>
                <strong className="text-forest-950">Count the full cost.</strong> Compare the total fee, taxes and EMI interest against what you expect to gain. Higher fees can be worth it for a credential you specifically need, but not for skills you can learn with guidance for less.
              </p>
              <p>
                <strong className="text-forest-950">Look for feedback, not just videos.</strong> Most beginners stall when they get stuck alone. Whatever format you pick, make sure someone will answer your questions and review your work.
              </p>
            </div>
          </div>
          <div className="rounded-3xl bg-forest-50/70 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-forest-950">6 questions to ask before you pay for any course</h2>
            <ol className="mt-5 space-y-3">
              {checklist.map((q, i) => (
                <li key={q} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-xs font-bold text-spark-400">{i + 1}</span>
                  {q}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* where nuels fits */}
        <section className="mt-16" aria-labelledby="fit">
          <h2 id="fit" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
            Where Nuels fits, and when it doesn&apos;t
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="rounded-3xl border border-forest-100 bg-white p-6">
              <h3 className="font-semibold text-forest-950">Nuels is a good fit if you…</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {["Want a named mentor who reviews your projects", "Are a beginner or switching careers", "Need to learn around a job or college", "Want a practical portfolio, not just a certificate"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-forest-100 bg-white p-6">
              <h3 className="font-semibold text-forest-950">Look elsewhere if you…</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {["Need a university degree or diploma", "Only need one quick tool tutorial", "Want a topic we don't teach yet", "Prefer full-time, classroom-style schedules"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CloseIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-600">Explore our mentor-led courses:</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {courses.map((c) => (
              <li key={c.slug}>
                <Link href={`/courses/${c.slug}`} className="inline-block rounded-full border border-forest-100 bg-white px-4 py-2 text-sm font-medium text-forest-800 transition hover:border-forest-300 hover:text-forest-600">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* faq */}
        <section className="mt-16" aria-labelledby="compare-faq">
          <h2 id="compare-faq" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-6 space-y-4">
            {faqs.map((f) => (
              <div key={f.question} className="rounded-2xl border border-forest-100 bg-white p-5 sm:p-6">
                <h3 className="font-semibold text-forest-950">{f.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* method + sources */}
        <section className="mt-12 rounded-2xl border border-dashed border-forest-200 p-5 text-xs leading-relaxed text-slate-500" aria-label="Method and sources">
          <p>
            <strong className="text-forest-900">How we compared:</strong> we grouped providers by course format using information each provider publishes on its own website. Nuels prices and policies are our own and current as of {updatedLabel}. We don&apos;t list competitor prices because they vary by course and program and change often. Udemy, Scaler and upGrad are trademarks of their respective owners; we are not affiliated with them.
          </p>
          <p className="mt-2">
            Provider websites:{" "}
            {formats
              .flatMap((f) => [f.href, f.href2])
              .filter((h): h is string => !!h && h.startsWith("http"))
              .map((h, i, all) => (
                <span key={h}>
                  <a href={h} rel="nofollow noopener" target="_blank" className="underline hover:text-forest-700">
                    {h.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </a>
                  {i < all.length - 1 ? ", " : ""}
                </span>
              ))}
          </p>
        </section>
      </article>

      <Cta />
    </>
  );
}
