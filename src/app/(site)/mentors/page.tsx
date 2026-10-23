import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { breadcrumbSchema, JsonLd, pageMetadata } from "@/lib/seo";
import Mentors from "@/components/Mentors";
import WhyNuels from "@/components/WhyNuels";
import Cta from "@/components/Cta";

export const metadata: Metadata = pageMetadata({
  title: "Industry Expert Mentors",
  path: "/mentors",
  description:
    "Meet Nuels mentors with 10 to 22+ years of industry experience in engineering, design, marketing and business consulting. Learn directly from professionals who do the work.",
  keywords: ["industry expert mentors", "online mentorship India", "learn from professionals"],
});

export default function MentorsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Mentors", path: "/mentors" }])} />
      <PageHero
        eyebrow="Mentors"
        title="Learn Directly from"
        highlight="Industry Experts"
        subtitle="Each course at Nuels is taught by a mentor who has spent years working in that field, so you learn the skills that matter on the job."
      />
      <Mentors standalone />
      <WhyNuels />
      <Cta />
    </>
  );
}
