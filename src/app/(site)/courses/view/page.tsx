import type { Metadata } from "next";
import { Suspense } from "react";
import CourseDetailView from "@/components/CourseDetailView";

export const metadata: Metadata = {
  title: "Course",
  robots: { index: false, follow: true },
};

export default function CourseViewPage() {
  return (
    <Suspense>
      <CourseDetailView />
    </Suspense>
  );
}
