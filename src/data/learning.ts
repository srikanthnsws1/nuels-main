// The learning structure of a course, derived from its syllabus (see syllabusFor in
// src/lib/catalog.ts): every topic is a lesson, and every module ends with an assignment.

type Syllabus = { title: string; topics: string[] }[];

export type Lesson = { id: string; title: string; module: number };
export type Module = { title: string; lessons: Lesson[] };
export type Assignment = { id: string; module: number; title: string; brief: string };

export function modulesFor(syllabus: Syllabus): Module[] {
  return syllabus.map((m, i) => ({
    title: m.title,
    lessons: m.topics.map((t, j) => ({ id: `m${i + 1}-l${j + 1}`, title: t, module: i })),
  }));
}

export function assignmentsFor(syllabus: Syllabus): Assignment[] {
  return syllabus.map((m, i) => ({
    id: `a${i + 1}`,
    module: i,
    title: `${m.title}: practice task`,
    brief: `Apply what you learned in "${m.title}". Cover ${m.topics
      .map((t) => t.toLowerCase())
      .join(", ")
      .replace(/, ([^,]*)$/, " and $1")}. Explain your approach and decisions, and include links to your work (Figma, GitHub, Drive, etc.) if you have them.`,
  }));
}

/** Career documents to prepare, by course. */
const documentsByCourse: Record<string, string[]> = {
  "ui-ux-design-masterclass": ["Portfolio website with 2–3 case studies", "Behance or Dribbble profile", "Case study PDF for applications"],
  "full-stack-web-development-bootcamp": ["GitHub profile with pinned projects", "Deployed project links", "README for each project"],
  "python-for-data-analysis": ["GitHub or Kaggle profile with notebooks", "One-page analysis report", "Dashboard screenshots for your portfolio"],
  "social-media-content-marketing": ["Campaign case study", "Content portfolio (posts, reels, ads)", "Analytics report sample"],
  "business-strategy-for-founders": ["One-page strategy document", "Pitch deck", "Simple financial model"],
  "spoken-english-communication": ["Self-introduction script", "Recorded mock interview answer", "Common interview answers list"],
};

const commonDocuments = ["Resume tailored to the role", "LinkedIn profile updated with course skills", "Cover letter template"];

export function documentsFor(slug: string): string[] {
  return [...commonDocuments, ...(documentsByCourse[slug] ?? [])];
}

/** Turns a YouTube, Vimeo or Google Drive link into an embeddable URL; null for a direct video file. */
export function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url) ? null : url;
}
