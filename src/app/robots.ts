import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo";

export const dynamic = "force-static";

// Public pages are open to search engines and AI crawlers; account pages are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/login"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
