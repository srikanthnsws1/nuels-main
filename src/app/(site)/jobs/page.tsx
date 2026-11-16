import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { JobsPage } from "@/components/dashboard/StudentExtras";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Jobs at Nuel Smart",
  path: "/jobs",
  description: "Current openings at Nuel Smart: trainers, faculty and team roles. See the details and apply.",
});

export default function Jobs() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title="Jobs at"
        highlight="Nuel Smart"
        subtitle="Join our team of mentors, faculty and staff. New openings are posted here first."
      />
      <section className="pb-20 sm:pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <JobsPage />
        </div>
      </section>
    </>
  );
}
