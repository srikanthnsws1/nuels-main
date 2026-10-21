import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { breadcrumbSchema, faqSchema, JsonLd, pageMetadata } from "@/lib/seo";
import Faq from "@/components/Faq";
import Cta from "@/components/Cta";

export const metadata: Metadata = pageMetadata({
  title: "FAQ — Courses, Mentors, Certificates & Refunds",
  path: "/faq",
  description:
    "Answers about Nuels online courses: course access, live sessions, mentor support, certificates, payment methods including UPI and EMI, and the 7-day refund policy.",
  keywords: ["online course refund policy", "course certificate", "UPI EMI course payment"],
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={[faqSchema, breadcrumbSchema([{ name: "FAQ", path: "/faq" }])]} />
      <PageHero
        eyebrow="FAQ"
        title="Frequently Asked"
        highlight="Questions"
        subtitle="Got questions? We have answers. Here's everything you need to know before you start learning with Nuels."
      />
      <Faq standalone />
      <Cta />
    </>
  );
}
