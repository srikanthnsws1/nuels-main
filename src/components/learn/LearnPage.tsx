"use client";

import { useSearchParams } from "next/navigation";
import CourseView from "./CourseView";

/** /learn?course={slug}: works for built-in and admin-added courses alike. */
export default function LearnPage() {
  return <CourseView slug={useSearchParams().get("course") ?? ""} />;
}
