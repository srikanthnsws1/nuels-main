import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import SmoothScroll from "@/components/motion/SmoothScroll";
import { JsonLd, organizationSchema, site, siteUrl, websiteSchema } from "@/lib/seo";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `Mentor-Led Online Courses in India | ${site.name} by ${site.legalName}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: site.keywords,
  applicationName: site.name,
  authors: [{ name: site.legalName, url: siteUrl }],
  creator: site.legalName,
  publisher: site.legalName,
  category: "education",
  formatDetection: { telephone: true, email: true, address: false },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    images: [site.ogImage],
  },
  twitter: { card: "summary_large_image", images: [site.ogImage.url] },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: "#114b3c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <JsonLd data={[organizationSchema, websiteSchema]} />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
