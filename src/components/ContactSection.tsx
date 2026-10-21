"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon, MailIcon, PhoneIcon, PinIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { contactInfo } from "@/data/site";

const channels = [
  { icon: PhoneIcon, label: "Call us", links: contactInfo.phones, note: "Mon–Sat, 9am – 7pm IST" },
  {
    icon: MailIcon,
    label: "Email us",
    links: [{ display: contactInfo.email, href: `mailto:${contactInfo.email}` }],
    note: "We reply within a few hours",
  },
  { icon: PinIcon, label: "Visit us", links: [{ display: contactInfo.address, href: undefined }], note: "By appointment only" },
];

const topics = ["Choosing a course", "Mentorship & sessions", "Payments & refunds", "Become a mentor", "Something else"];

const field =
  "w-full rounded-2xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300 focus:shadow-lg focus:shadow-forest-900/5";

export default function ContactSection() {
  const [sent, setSent] = useState(false);

  // No backend yet — acknowledge the message locally.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
    e.currentTarget.reset();
  };

  return (
    <section className="pb-20 sm:pb-24">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3 lg:col-span-2 lg:grid-cols-1 lg:content-start">
          {channels.map(({ icon: Icon, label, links, note }, i) => (
            <Reveal key={label} variant="left" delay={i * 120} className="h-full">
              <div className="flex h-full items-start gap-4 rounded-3xl border border-forest-100 bg-white p-5 transition sm:p-6 md:flex-col lg:flex-row hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/10">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-forest-600">{label}</p>
                  {links.map(({ display, href }) =>
                    href ? (
                      <a key={href} href={href} className="mt-1 block break-all font-semibold text-forest-950 hover:text-forest-600">
                        {display}
                      </a>
                    ) : (
                      <p key={display} className="mt-1 font-semibold text-forest-950">
                        {display}
                      </p>
                    ),
                  )}
                  <p className="mt-0.5 text-sm text-slate-500">{note}</p>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal variant="left" delay={360} className="md:col-span-3 lg:col-span-1">
            <div className="rounded-3xl bg-forest-700 p-6">
              <p className="font-semibold text-white">Want to teach on Nuels?</p>
              <p className="mt-1 text-sm leading-relaxed text-forest-100">
                If you have 8+ years of industry experience, we&apos;d love to hear from you. Pick &ldquo;Become a
                mentor&rdquo; in the form.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal variant="right" delay={150} className="lg:col-span-3">
          <div className="h-full rounded-3xl bg-forest-50/60 p-5 sm:p-8 xl:p-10">
            <h2 className="text-2xl font-bold tracking-tight text-forest-950">Send us a message</h2>
            <p className="mt-2 text-sm text-slate-600">Tell us a little about what you need and we&apos;ll get back to you.</p>

            {sent && (
              <div role="status" className="mt-6 rounded-2xl bg-forest-700 px-5 py-4 text-sm text-white">
                <span className="font-semibold text-spark-400">Thank you!</span> Your message has been received.
                Our team will reach out shortly.
              </div>
            )}

            <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-forest-900">Full name</span>
                <input required name="name" placeholder="Your name" className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-forest-900">Email</span>
                <input required type="email" name="email" placeholder="you@example.com" className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-forest-900">Phone (optional)</span>
                <input type="tel" name="phone" placeholder="+91" className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-forest-900">Topic</span>
                <select name="topic" defaultValue={topics[0]} className={field}>
                  {topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-forest-900">Message</span>
                <textarea required name="message" rows={5} placeholder="How can we help?" className={`${field} resize-none`} />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600"
                >
                  Send Message
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
