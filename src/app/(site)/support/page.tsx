import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import SupportSection from "@/components/SupportSection";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Help & Support",
  path: "/support",
  description: "Lost your password or Student ID? Raise a support ticket and the Nuel Smart team will help you get back in.",
  noIndex: true,
});

export default function SupportPage() {
  return (
    <>
      <PageHero
        eyebrow="Help & Support"
        title="Raise a"
        highlight="support ticket"
        subtitle="Lost your password or Student ID, or stuck with a payment or course? Tell us and our team will get back to you."
      />
      <SupportSection />
    </>
  );
}
