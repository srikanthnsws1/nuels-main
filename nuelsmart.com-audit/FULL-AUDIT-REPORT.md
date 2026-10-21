# Nuels (nuelsmart.com): Full SEO Audit

**Date:** 18 October 2026 · **Audited:** production static export of the current code (23 pages, served locally like Firebase `cleanUrls`), plus live checks of `nuelsmart.com` and `nuelsmart-fb72e.web.app`
**Business type:** Online education, mentor-led courses (India, based in Hyderabad). Hybrid: national online audience with a local base.
**Tools:** claude-seo skills (audit + competitor-pages method), a custom crawler, Google SERP sampling. No DataForSEO, Search Console or GA4 data was available, so there are **no search-volume or ranking numbers** in this report.

---

## Executive summary

**SEO Health Score: 70 / 100** for the current code once it is deployed to the real domain. The live site today scores far lower, because the domain doesn't serve it (see Critical #1).

| Category | Weight | Score | Notes |
|---|---|---|---|
| Technical SEO | 22% | 55 | Strong setup, held back by the parked domain |
| Content quality | 23% | 60 | Good structure; course pages ~500 words; trust signals unverified |
| On-page SEO | 20% | 85 | Keyword-led titles and H1s on every indexable page |
| Schema / structured data | 10% | 85 | Organization, Course, FAQPage, Breadcrumb, Article, Person |
| Performance (CWV) | 10% | 70 | *Estimated*: images fixed (79.7 MB → 1.5 MB on home); not lab-measured |
| AI search readiness | 10% | 80 | llms.txt, AI crawlers allowed, FAQ answers, clear facts |
| Images | 5% | 75 | All alt text present; WebP; no responsive srcset (static export) |

### Top 5 critical / high issues
1. **Critical: nuelsmart.com is a parked domain.** It returns a 114-byte page that redirects to `/lander` (parking IPs 3.33.130.190 / 15.197.148.33). Every canonical, sitemap URL and schema `@id` points there. Until the domain is connected to Firebase Hosting, Google can't index the real site.
2. **Critical: the live Firebase site is an old build.** `nuelsmart-fb72e.web.app` returns 404 for `/robots.txt`, `/sitemap.xml` and `/llms.txt`. None of the SEO work is live yet.
3. **High: course pages are thinner than ranking competitors.** About 510–560 words each, against competitor course pages that run long with syllabus, fees, batches, projects and reviews.
4. **High: trust content is unverified.** Mentor profiles and learner stories need real names, photos, LinkedIn links and permission. Google's E-E-A-T guidelines and Indian consumer law both penalise invented testimonials.
5. **High: no off-site authority.** A new domain has no backlinks, no Google Business Profile and no reviews.

### Fixed in this session
- **Removed every invented number**: 60k+ learners, 4.8/5 ratings, 120+ courses, per-course learner counts, "students mentored" and category course counts. They are replaced with checkable promises (weekly live sessions, 1:1 project reviews, lifetime access, 7-day refund).
- **Images 79.4 MB → 1.15 MB** (WebP, sized for display) plus a 1200×630 social share image.
- **6 new course pages** (`/courses/<slug>`), each targeting its own keyword, with syllabus, outcomes, audience, tools, mentor, course FAQs, Course + FAQPage + Breadcrumb schema, and an Enroll button.
- **Comparison page** `/compare/mentor-led-vs-self-paced-courses`, built to the competitor-pages method: fair, sourced, dated, no unverified competitor prices.
- **Keywords placed** in the home title/H1, courses H1, course pages, footer links, sitemap (13 URLs) and llms.txt.
- **404 page** is now `noindex` with its own title (it was indexable with the home title).

---

## Technical SEO (55)

**Works:** static HTML for every page (no JS-only rendering), one canonical per page, `robots.txt` blocks only `/login` and `/dashboard`, XML sitemap with 13 URLs and image entries, `noindex` on login, dashboard and 404, `lang="en-IN"`, theme colour, web manifest, HTTPS on Firebase, clean URLs.

| Severity | Finding | Fix |
|---|---|---|
| Critical | Domain parked; canonicals point to a parking page | Connect `nuelsmart.com` in Firebase → Hosting → Add custom domain; update DNS A/TXT records at your registrar; remove the parking redirect |
| Critical | Live deploy is outdated | `npm.cmd run build` then `firebase deploy` |
| High | `www` and apex both resolve | After connecting, redirect `www.nuelsmart.com` → `nuelsmart.com` in Firebase |
| Medium | No security headers beyond Firebase defaults | Add `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` in `firebase.json` headers |
| Medium | Not yet in Search Console / Bing | Verify the domain, submit `sitemap.xml`, request indexing of the course pages |

## Content quality (60)

| Severity | Finding | Fix |
|---|---|---|
| High | Course pages ~510–560 words | Add real batch dates, a sample lesson video, 2–3 real project examples, mentor credentials, and course-specific reviews once you have them |
| High | Testimonials and mentor bios need verification | Use real learners with permission; link mentors' LinkedIn; add mentor bio paragraphs |
| High | Curriculum text was drafted from course descriptions | **Review `src/data/courseDetails.ts` with each mentor** and correct modules, tools and FAQs |
| Medium | No blog or guide content to target informational searches | Start the content plan in ACTION-PLAN.md (e.g. "how to become a UI/UX designer in India") |
| Medium | No About page (who runs nuelsmart, where, why) | Add `/about` with founders, address and registration details |

## On-page SEO (85)

All 13 indexable pages have unique titles (31–59 characters), descriptions (151–208 characters), exactly one H1, canonicals and Open Graph/Twitter tags. Internal links now go from cards, footer, related courses and the comparison page to every course page.

| Severity | Finding | Fix |
|---|---|---|
| Low | Home description is 208 characters (Google truncates around 155–160) | Trim when you next edit copy |
| Low | Contact H1 "Let's Connect with Us" has no keyword | Optional: "Contact Nuels in Hyderabad" |

## Schema (85)

Present: EducationalOrganization (address, 2 ContactPoints), WebSite, ItemList of Course with Offer (INR) and CourseInstance (Online, workload, instructor), FAQPage (home, /faq, every course page, compare), BreadcrumbList (all inner pages), Article (compare), Person (mentors). **No AggregateRating**: there are no real reviews yet, and invented ratings risk a manual action.

| Severity | Finding | Fix |
|---|---|---|
| Medium | No `sameAs` social profiles on the Organization | Add real Instagram, LinkedIn and YouTube URLs once they exist (the footer icons are `#` today) |
| Low | Validate after deploy | Run each URL through Google's Rich Results Test |

## Performance (70, estimated)

Home page images 79.7 MB → **1.49 MB**. JS first load ~110–129 kB per page. Lab Core Web Vitals were not measured (the audit tool's Chromium runtime wasn't set up).

| Severity | Finding | Fix |
|---|---|---|
| Medium | `images.unoptimized` (static export) means no responsive `srcset` | Fine for now; consider a loader or a CDN later |
| Medium | Original 4 MB PNGs are still in `public/images` and get deployed | Move them out of `public/` (they're no longer referenced except `logo-mark.png`) |
| Low | Lenis smooth scroll adds JS on every page | Keep; monitor INP after launch |

## Images (75)
All images have alt text. Fill-mode images have no width/height attributes, but their containers set aspect ratios, so there's no layout shift. WebP everywhere except the logo and the social share image (JPEG for compatibility).

## AI search readiness (80)
`llms.txt` (summary, pages, 6 course links, mentors, policies, contact), AI crawlers allowed in robots.txt, question-and-answer content, consistent NAP. Missing: off-site brand mentions, which AI assistants rely on heavily.

---

## Competitor & keyword analysis

Google SERP sampling shows that each topic is won by **one dedicated landing page per course**, often with a city modifier:

| Search | Who ranks (sampled) | What their page has |
|---|---|---|
| UI UX design course online with mentor India | AND Academy, Careers360 listings (CareerFoundry, IIT Guwahati) | Dedicated course page, live online, mentor feedback, long programmes, offers |
| full stack web development course Hyderabad | AccioJob, CCBP (NxtWave), KnowledgeHut | City pages ("…in Hyderabad"), placement support, months-long programmes |
| digital marketing course in Hyderabad online | WsCube Tech, StarAgile, Simplilearn, Tech Mahindra SMART Academy | City landing pages and "10 best courses in Hyderabad" listicles |
| spoken English course online India | Adda247, Awal English, Bodhisutra | Live-class product pages, 1:1 practice |
| python for data analysis course India | Udemy, IIT Kanpur E&ICT, NIELIT, tutor marketplaces | Short courses, government/IIT credentials, tutors |

**What this means:** national head terms ("UI UX design course online") are dominated by established brands and won't be won quickly by a new domain. The realistic path is (1) a page per course (done), (2) **"in Hyderabad" local variants**, (3) long-tail and question content, (4) brand searches once marketing starts.

### Keyword map (placed in the site)

| Page | Primary keyword | Secondary keywords |
|---|---|---|
| `/` | mentor-led online courses India | online courses with mentors, online courses taught by experienced mentors |
| `/courses` | online courses with expert mentors | mentor-led online courses in design, tech & business |
| `/courses/ui-ux-design-masterclass` | UI/UX design course online | UI UX course in Hyderabad, Figma course for beginners |
| `/courses/full-stack-web-development-bootcamp` | full stack web development course | full stack developer course in Hyderabad, MERN stack course |
| `/courses/python-for-data-analysis` | Python for data analysis course | data analytics course online, data analyst course in Hyderabad |
| `/courses/social-media-content-marketing` | digital marketing course online | social media marketing course, digital marketing course in Hyderabad |
| `/courses/business-strategy-for-founders` | business strategy course online | entrepreneurship course India, startup course for founders |
| `/courses/spoken-english-communication` | spoken English course online | English speaking course for professionals, spoken English classes in Hyderabad |
| `/mentors` | industry expert mentors | online mentorship India |
| `/faq` | course refund policy, certificate | UPI EMI course payment |
| `/contact` | contact nuelsmart | online course counselling Hyderabad |
| `/compare/mentor-led-vs-self-paced-courses` | mentor-led vs self-paced courses | Udemy alternatives India, bootcamp vs online course |

### Competitor-pages deliverable
Built `/compare/mentor-led-vs-self-paced-courses` as a **format comparison** (self-paced marketplaces such as Udemy · mentor-led Nuels · bootcamps and degrees such as Scaler and upGrad) with a feature matrix, strengths and trade-offs for each format, a "when Nuels isn't right" section, a buyer checklist, FAQPage + Article schema, a last-updated date, a disclosure and source links. **Competitor prices are deliberately left out**: the only figures found were from third-party blogs, and the method requires verifiable, dated data.

Sources sampled: [AND Academy](https://www.andacademy.com/ui-ux-design-courses/), [Careers360 – CareerFoundry](https://www.careers360.com/courses-certifications/careerfoundry-ui-for-ux-designers-course-course), [AccioJob Hyderabad](https://acciojob.com/full-stack-development-course-hyderabad-offline), [CCBP Hyderabad](https://ccbp.in/intensive/mern-stack-developer-course-in-hyderabad), [KnowledgeHut Hyderabad](https://knowledgehut.com/web-development/fullstack-development-bootcamp-training-hyderabad), [WsCube Tech](https://www.wscubetech.com/blog/digital-marketing-courses-hyderabad/), [StarAgile](https://staragile.com/marketing/digital-marketing-course-hyderabad), [Simplilearn](https://www.simplilearn.com/digital-marketing-course-hyderabad-city), [Adda247](https://www.adda247.com/product-onlineliveclasses/5647/spoken-english-course-2-o-live-classes), [Bodhisutra](https://bodhisutra.com/english-speaking-course-online-for-business-professionals-students-and-housewives), [IIT Kanpur via Careers360](https://www.careers360.com/university/indian-institute-of-technology-kanpur/python-data-analysis-certification-course), [Udemy alternatives guide](https://alternatives.co/blog/best-udemy-alternatives-for-indian-students/), [Scaler review](https://interviewbit.com/scaler-academy-review).
