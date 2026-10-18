import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { breadcrumbSchema, contactPageSchema, JsonLd, pageMetadata } from "@/lib/seo";
import ContactSection from "@/components/ContactSection";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  path: "/contact",
  description:
    "Contact Nuels (nuelsmart) in Hyderabad for course guidance, mentorship, payments or teaching with us. Call +91 81218 46844 or email info@nuelsmart.com.",
  keywords: ["contact nuelsmart", "online course counselling Hyderabad"],
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={[contactPageSchema, breadcrumbSchema([{ name: "Contact", path: "/contact" }])]} />
      <PageHero
        eyebrow="Contact"
        title="Let's Connect"
        highlight="with Us"
        subtitle="Have questions about a course or mentor? Our team is here to help you choose the right path."
      />
      <ContactSection />
    </>
  );
}
