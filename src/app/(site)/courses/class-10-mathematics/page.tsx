import type { Metadata } from "next";
import SubjectChapters from "@/components/SubjectChapters";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Class 10 Mathematics: Chapter-wise Live Classes",
  path: "/courses/class-10-mathematics",
  description:
    "Tenth Class Mathematics (CBSE 2026-27) chapter-wise live classes on Google Meet with YouTube recordings. ₹299 per chapter. Pick only the chapters you need.",
  keywords: ["class 10 maths classes online", "10th class maths chapter wise", "CBSE class 10 maths tuition online", "class 10 maths Hyderabad"],
});

export default function Class10MathematicsPage() {
  return <SubjectChapters group="class-10-maths" />;
}
