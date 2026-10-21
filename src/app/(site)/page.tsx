import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import WhyNuels from "@/components/WhyNuels";
import PopularCourses from "@/components/PopularCourses";
import Mentors from "@/components/Mentors";
import Stories from "@/components/Stories";
import Faq from "@/components/Faq";
import Cta from "@/components/Cta";
import { courseListSchema, faqSchema, JsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/",
  description:
    "Learn job-ready skills from experienced industry mentors. Online courses in UI/UX design, web development, Python, digital marketing, business and spoken English with live sessions, projects and certificates.",
  keywords: ["best online courses with mentors", "career courses online India"],
});

export default function Home() {
  return (
    <>
      <JsonLd data={[courseListSchema, faqSchema]} />
      <Hero />
      <Categories />
      <WhyNuels />
      <PopularCourses />
      <Mentors />
      <Stories />
      <Faq />
      <Cta />
    </>
  );
}
