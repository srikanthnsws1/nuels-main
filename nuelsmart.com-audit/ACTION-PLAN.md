# Nuels SEO Action Plan

What it takes to rank. This is a new domain with no history. Expect **3–6 months** to show for long-tail and Hyderabad searches, and longer for national head terms. Nobody can guarantee #1 on Google; these steps give you the best chance.

## Phase 1: Critical fixes (this week)
- [ ] **Connect nuelsmart.com to Firebase Hosting** (Hosting → Add custom domain → copy the A and TXT records to your domain registrar). Remove the parking/lander page.
- [ ] Redirect `www.nuelsmart.com` → `nuelsmart.com`.
- [ ] Deploy the current code: stop the dev server, run `npm.cmd run build`, then `firebase deploy`.
- [ ] Check `https://nuelsmart.com/robots.txt`, `/sitemap.xml` and `/llms.txt` load.
- [ ] Verify the domain in **Google Search Console** and **Bing Webmaster Tools**. Submit `sitemap.xml`, then request indexing for the home page and the 6 course pages.
- [ ] Run every URL through Google's **Rich Results Test**.

## Phase 2: High-impact (weeks 2–3)
- [ ] Review `src/data/courseDetails.ts` **with each mentor** and correct modules, tools and FAQs so every claim is true.
- [ ] Replace placeholder mentor and learner content with **real people** (names, photos, LinkedIn links, written permission). Delete any story you can't verify.
- [ ] Create a **Google Business Profile** for nuelsmart in Hyderabad, with the same name, address and phones as the website.
- [ ] Add real social profile links to the footer, and to `sameAs` in `src/lib/seo.tsx`.
- [ ] Move the unused 4 MB originals out of `public/images` so they aren't deployed.
- [ ] Add security headers in `firebase.json`.

## Phase 3: Content & authority (month 2)
- [ ] **Hyderabad landing pages** for the competitive local searches, each with unique content (batch timings, local workshops, directions). Don't make copies with only the city name changed:
  - `/full-stack-developer-course-hyderabad`
  - `/digital-marketing-course-hyderabad`
  - `/ui-ux-design-course-hyderabad`
- [ ] Grow each course page past 1,000 words with real material: a sample lesson video, student project screenshots, batch calendar and mentor Q&A.
- [ ] Start a **guides section** (2 articles a month) targeting questions people search for:
  - How to become a UI/UX designer in India (with no degree)
  - Full stack developer roadmap for beginners
  - Data analyst skills and salary guide India
  - Digital marketing career guide
  - How to improve spoken English for interviews
- [ ] Add an **/about** page: founders, company details, address and why Nuels exists.
- [ ] **Backlinks:** list Nuels on education directories (Careers360, Shiksha, Sulekha, JustDial), local Hyderabad business listings and college placement cells. Pitch mentors for guest posts and podcasts.
- [ ] Collect **real reviews** on Google Business Profile after the first batch. Only add rating schema once you have genuine reviews.

## Phase 4: Monitor & iterate (ongoing)
- [ ] Check Search Console monthly: queries, CTR and pages not indexed.
- [ ] Rewrite titles and descriptions for pages with many impressions but a low CTR.
- [ ] Update the comparison page every quarter (the "last updated" date).
- [ ] Re-run `/seo-audit` after each major release.
