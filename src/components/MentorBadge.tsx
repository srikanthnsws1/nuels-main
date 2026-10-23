import { initials } from "./dashboard/ui";
import type { Course } from "@/lib/courses";

/** The course's mentor: profile picture, name and designation (e.g. "Software Engineer"). */
export default function MentorBadge({
  course,
  size = "sm",
  light = false,
}: {
  course: Pick<Course, "mentorName" | "mentorDesignation" | "mentorPhoto">;
  size?: "sm" | "md";
  light?: boolean;
}) {
  const avatar = size === "md" ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-forest-700 font-bold text-spark-400 ${avatar}`}>
        {course.mentorPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL avatar
          <img src={course.mentorPhoto} alt={course.mentorName} className="h-full w-full object-cover" />
        ) : (
          initials(course.mentorName)
        )}
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-sm font-semibold ${light ? "text-white" : "text-forest-950"}`}>{course.mentorName}</span>
        {course.mentorDesignation && (
          <span className={`block truncate text-xs ${light ? "text-forest-100" : "text-slate-500"}`}>{course.mentorDesignation}</span>
        )}
      </span>
    </div>
  );
}
