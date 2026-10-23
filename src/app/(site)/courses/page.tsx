import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { breadcrumbSchema, JsonLd, pageMetadata } from "@/lib/seo";
import PopularCourses from "@/components/PopularCourses";
import Categories from "@/components/Categories";
import Cta from "@/components/Cta";

export const metadata: Metadata = pageMetadata({
  title: "Online Courses with Expert Mentors",
  path: "/courses",
  description:
    "Explore mentor-led online courses in design, web development, data, digital marketing, business and spoken English. Live sessions with your mentor and lifetime access.",
  keywords: ["online courses", "UI UX course", "web development bootcamp", "data analysis course", "marketing course"],
});

export default function CoursesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Courses", path: "/courses" }])} />
      <PageHero
        eyebrow="Courses"
        title="Mentor-Led Online Courses in"
        highlight="Design, Tech & Business"
        subtitle="Practical, project-based courses built by people who have done the work. Filter by subject and start learning at your own pace."
      >
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-3 text-sm">
          {["Posted by our mentors", "Daily live sessions", "Lifetime access"].map((t) => (
            <span key={t} className="rounded-full border border-forest-100 bg-white px-4 py-2 font-semibold text-forest-700 shadow-sm">
              {t}
            </span>
          ))}
        </div>
      </PageHero>
      <PopularCourses standalone />
      <div className="bg-forest-50/60">
        <Categories />
      </div>
      <Cta />
    </>
  );
}
