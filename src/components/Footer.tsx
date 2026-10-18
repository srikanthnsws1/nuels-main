import Link from "next/link";
import Logo from "./Logo";
import { contactInfo } from "@/data/site";
import { MailIcon, PhoneIcon, PinIcon, SocialIcon } from "./icons";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Mentors", href: "/mentors" },
  { label: "Success Stories", href: "/stories" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Compare Course Formats", href: "/compare/mentor-led-vs-self-paced-courses" },
];
const popularCourses = [
  { label: "UI/UX Design", slug: "ui-ux-design-masterclass" },
  { label: "Full Stack Web Development", slug: "full-stack-web-development-bootcamp" },
  { label: "Python Data Analysis", slug: "python-for-data-analysis" },
  { label: "Digital Marketing", slug: "social-media-content-marketing" },
  { label: "Business Strategy", slug: "business-strategy-for-founders" },
  { label: "Spoken English", slug: "spoken-english-communication" },
];
const socials = ["facebook", "instagram", "linkedin", "youtube"] as const;

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-forest-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* connect band */}
        <div className="flex flex-col gap-6 border-b border-white/10 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Let&apos;s Connect with Us</h2>
            <p className="mt-2 max-w-md text-sm text-forest-200">
              Have questions about a course or mentor? Our team is here to help you choose the right path.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:flex sm:flex-wrap">
            <Link
              href="/contact"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Contact Us
            </Link>
            <Link
              href="/courses"
              className="rounded-full bg-spark-500 px-6 py-3 text-sm font-bold text-forest-900 transition hover:bg-spark-400"
            >
              Join Now
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:py-14 md:grid-cols-3 lg:grid-cols-12">
          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <Logo light />
            <p className="mt-5 text-sm leading-relaxed text-forest-200">
              Subscribe to our newsletter for new courses, mentor sessions and learning tips.
            </p>
            <form className="mt-4 flex max-w-md gap-2 rounded-full bg-white/5 p-1.5 ring-1 ring-white/10">
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email address"
                className="w-full bg-transparent px-4 text-sm text-white outline-none placeholder:text-forest-300"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-spark-500 px-5 py-2.5 text-sm font-bold text-forest-900 hover:bg-spark-400"
              >
                Subscribe
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 lg:col-start-6">
            <h3 className="font-semibold text-white">Quick Links</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-spark-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="font-semibold text-white">Popular Courses</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {popularCourses.map((l) => (
                <li key={l.slug}>
                  <Link href={`/courses/${l.slug}`} className="hover:text-spark-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1 lg:col-span-3">
            <h3 className="font-semibold text-white">Contact Information</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-spark-400" />
                <span className="flex flex-col gap-1">
                  {contactInfo.phones.map((p) => (
                    <a key={p.href} href={p.href} className="hover:text-spark-400">
                      {p.display}
                    </a>
                  ))}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MailIcon className="mt-0.5 h-4 w-4 shrink-0 text-spark-400" />
                <a href={`mailto:${contactInfo.email}`} className="break-all hover:text-spark-400">
                  {contactInfo.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-spark-400" />
                {contactInfo.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-center text-xs text-forest-300 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} nuelsmart. All rights reserved. · Privacy Policy · Terms &amp; Conditions</p>
          <div className="flex gap-2">
            {socials.map((s) => (
              <a
                key={s}
                href="#"
                aria-label={s}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-spark-500 hover:text-forest-900"
              >
                <SocialIcon name={s} className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
