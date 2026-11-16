"use client";

import SupportForm from "./SupportForm";
import { useAuth } from "@/lib/auth";
import { contactInfo } from "@/data/site";

export default function SupportSection() {
  const { user, ready } = useAuth();
  return (
    <section className="pb-20 sm:pb-24">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-3xl bg-forest-700 p-6 text-white">
            <p className="font-semibold">Forgot your password?</p>
            <p className="mt-1 text-sm leading-relaxed text-forest-100">
              On the login page, type your email or ID and click <strong>Forgot password?</strong> to get a reset link straight away.
            </p>
          </div>
          <div className="rounded-3xl border border-forest-100 bg-white p-6 text-sm text-slate-600">
            <p className="font-semibold text-forest-950">No access to your email, or forgot your ID?</p>
            <p className="mt-1 leading-relaxed">
              Raise a ticket with your name and mobile number. We&apos;ll confirm it&apos;s you and help you back in. You can also call{" "}
              {contactInfo.phones[0] && (
                <a href={contactInfo.phones[0].href} className="font-semibold text-forest-700">
                  {contactInfo.phones[0].display}
                </a>
              )}
              .
            </p>
          </div>
        </aside>
        <div className="rounded-3xl bg-forest-50/60 p-5 sm:p-8 lg:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight text-forest-950">Raise a ticket</h2>
          <p className="mt-1 mb-6 text-sm text-slate-600">We usually reply within one working day.</p>
          {ready && <SupportForm key={user?.uid ?? "guest"} user={user} />}
        </div>
      </div>
    </section>
  );
}
