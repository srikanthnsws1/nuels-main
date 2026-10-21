import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { breadcrumbSchema, courseListSchema, JsonLd, pageMetadata } from "@/lib/seo";
import PopularCourses from "@/components/PopularCourses";
import Categories from "@/components/Categories";
import Cta from "@/components/Cta";
import { courses } from "@/data/site";

export const metadata: Metadata = pageMetadata({
  title: "Online Courses with Expert Mentors",
  path: "/courses",
  description:
    "Explore mentor-led online courses in UI/UX design, full-stack web development, Python data analysis, digital marketing, business strategy and spoken English. Lifetime access and certificates.",
  keywords: ["online courses", "UI UX course", "web development bootcamp", "data analysis course", "marketing course"],
});

export default function CoursesPage() {
  return (
    <>
      <JsonLd data={[courseListSchema, breadcrumbSchema([{ name: "Courses", path: "/courses" }])]} />
      <PageHero
        eyebrow="Courses"
        title="Mentor-Led Online Courses in"
        highlight="Design, Tech & Business"
        subtitle="Practical, project-based courses built by people who have done the work. Filter by subject and start learning at your own pace."
      >
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-3 text-sm">
          {[`${courses.length}+ featured courses`, "Lifetime access", "Certificate included"].map((t) => (
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
