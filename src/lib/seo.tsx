import type { Metadata } from "next";
import { contactInfo, faqs } from "@/data/site";

/** Production address. Override with NEXT_PUBLIC_SITE_URL if the site is served elsewhere. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nuelsmart.com").replace(/\/$/, "");

export const site = {
  name: "Nuels",
  legalName: "nuelsmart",
  tagline: "Mentor-led online courses in India",
  description:
    "Nuels by nuelsmart is an online learning platform in India where every course is taught by an experienced industry mentor. Learn UI/UX design, full-stack web development, Python data analysis, digital marketing, business strategy and spoken English with live sessions and real projects.",
  locale: "en_IN",
  ogImage: { url: "/images/og-image.jpg", width: 1200, height: 630, alt: "Nuels — learn from experienced mentors" },
  keywords: [
    "online courses India",
    "mentor-led online courses",
    "learn from industry experts",
    "online courses with certificate",
    "UI UX design course online",
    "full stack web development course",
    "Python for data analysis course",
    "digital marketing course online",
    "business strategy course",
    "spoken English course online",
    "online learning platform Hyderabad",
    "nuelsmart",
    "Nuels",
  ],
};

export const absoluteUrl = (path = "/") => `${siteUrl}${path === "/" ? "" : path}`;

/** Per-page metadata with canonical URL, Open Graph and Twitter cards. */
export function pageMetadata({
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
  image = site.ogImage,
}: {
  title?: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  image?: { url: string; width: number; height: number; alt: string };
}): Metadata {
  const fullTitle = title ? `${title} | ${site.name}` : `Mentor-Led Online Courses in India | ${site.name} by ${site.legalName}`;
  return {
    ...(title ? { title } : { title: { absolute: fullTitle } }),
    description,
    keywords: [...keywords, ...site.keywords],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: site.name,
      locale: site.locale,
      title: fullTitle,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image.url],
    },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

/** Renders schema.org structured data. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const orgId = `${siteUrl}/#organization`;

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": orgId,
  name: site.name,
  alternateName: site.legalName,
  url: siteUrl,
  logo: absoluteUrl("/images/logo-mark.png"),
  description: site.description,
  email: contactInfo.email,
  telephone: contactInfo.phones[0].display,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Hyderabad",
    addressRegion: "Telangana",
    addressCountry: "IN",
  },
  contactPoint: contactInfo.phones.map((p) => ({
    "@type": "ContactPoint",
    telephone: p.display,
    email: contactInfo.email,
    contactType: "customer support",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi", "Telugu"],
  })),
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: site.name,
  description: site.description,
  inLanguage: "en-IN",
  publisher: { "@id": orgId },
};

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: absoluteUrl("/contact"),
  name: "Contact Nuels",
  about: { "@id": orgId },
};
