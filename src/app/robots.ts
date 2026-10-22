import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo";

export const dynamic = "force-static";

// Public pages are open to search engines and AI crawlers; account pages are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt"],
        // *.txt are Next.js page-data files (e.g. /login.txt), not pages people should land on.
        disallow: ["/dashboard", "/mentor", "/admin", "/login", "/register", "/signup", "/tutor", "/*.txt$"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl,
  };
}
