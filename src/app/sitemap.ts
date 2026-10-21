import type { MetadataRoute } from "next";
import { courses } from "@/data/site";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

const routes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/courses", priority: 0.9, changeFrequency: "weekly" },
  { path: "/mentors", priority: 0.8, changeFrequency: "monthly" },
  { path: "/stories", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/compare/mentor-led-vs-self-paced-courses", priority: 0.6, changeFrequency: "monthly" },
  ...courses.map((c) => ({ path: `/courses/${c.slug}`, priority: 0.9, changeFrequency: "monthly" as const })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
    images: path === "/" ? [absoluteUrl("/images/hero.webp")] : courses.filter((c) => path === `/courses/${c.slug}`).map((c) => absoluteUrl(c.image)),
  }));
}
