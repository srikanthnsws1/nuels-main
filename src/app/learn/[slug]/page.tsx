import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseView from "@/components/learn/CourseView";
import { courses } from "@/data/site";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = courses.find((c) => c.slug === slug);
  return { title: course ? `Learn: ${course.title}` : "Course", robots: { index: false, follow: false } };
}

export default async function LearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courses.find((c) => c.slug === slug);
  if (!course) notFound();
  return <CourseView course={course} />;
}
