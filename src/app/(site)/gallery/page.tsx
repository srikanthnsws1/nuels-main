import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { GalleryPage } from "@/components/dashboard/StudentExtras";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Gallery",
  path: "/gallery",
  description: "Life at Nuel Smart: photos of our company, team, classes and events.",
});

export default function Gallery() {
  return (
    <>
      <PageHero eyebrow="Gallery" title="Life at" highlight="Nuel Smart" subtitle="Our quiz toppers, team, classes and events." />
      <section className="pb-20 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <GalleryPage />
        </div>
      </section>
    </>
  );
}
