import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { breadcrumbSchema, JsonLd, pageMetadata } from "@/lib/seo";
import Stories from "@/components/Stories";
import Cta from "@/components/Cta";

export const metadata: Metadata = pageMetadata({
  title: "Student Success Stories",
  path: "/stories",
  description:
    "Read how Nuels learners became data analysts, frontend developers, UI designers and marketers with guidance from experienced mentors and real portfolio projects.",
  keywords: ["student success stories", "career change online course", "learner reviews"],
});

const stats = [
  ["Weekly", "Live doubt sessions"],
  ["1:1", "Mentor project reviews"],
  ["Lifetime", "Access to lessons"],
  ["7-day", "Refund policy"],
];

export default function StoriesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Success Stories", path: "/stories" }])} />
      <PageHero
        eyebrow="Stories"
        title="Stories from Our"
        highlight="Successful Learners"
        subtitle="See how everyday learners became confident professionals with guidance from their Nuels mentors."
      >
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/95 p-4 shadow-xl shadow-forest-900/5">
              <p className="text-2xl font-bold text-forest-900 sm:text-3xl">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </PageHero>
      <Stories standalone />
      <Cta />
    </>
  );
}
