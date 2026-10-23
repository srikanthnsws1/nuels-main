import type { Metadata } from "next";
import { Suspense } from "react";
import CourseDetail from "@/components/CourseDetail";
import Cta from "@/components/Cta";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Course Details",
  path: "/courses/view",
  description: "Course details, curriculum and mentor information for a Nuels mentor-led online course.",
});

// Courses are posted by mentors at runtime, so the page loads the course in the browser
// from ?id=<courseId>.
export default function CourseViewPage() {
  return (
    <>
      <Suspense>
        <CourseDetail />
      </Suspense>
      <Cta />
    </>
  );
}
