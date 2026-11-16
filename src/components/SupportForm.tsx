"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon, CheckIcon } from "./icons";
import type { AppUser } from "@/lib/auth";
import { raiseTicket, ticketCategories, type TicketCategory } from "@/lib/tickets";

const field =
  "w-full rounded-2xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";

/** Raise a support ticket. Logged-in learners get their details filled in; anyone else types them. */
export default function SupportForm({ user, onRaised }: { user?: AppUser | null; onRaised?: () => void }) {
  const [f, setF] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    memberId: user?.memberId ?? "",
    category: (user ? "course" : "forgot-password") as TicketCategory,
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (f.name.trim().length < 2) return setError("Please enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError("Please enter the email address you registered with.");
    if (f.phone.trim() && !/^(\+91[\s-]?)?[6-9]\d{9}$/.test(f.phone.replace(/\s/g, ""))) return setError("Enter a valid 10-digit mobile number, or leave it blank.");
    if (f.message.trim().length < 5) return setError("Please describe the problem.");
    setSending(true);
    try {
      setDone(await raiseTicket({ ...f, phone: f.phone.replace(/\s/g, "") }));
      setF((x) => ({ ...x, message: "" }));
      onRaised?.();
    } catch (err) {
      console.error("Could not raise ticket", err);
      setError("We couldn't send your ticket. Please check your connection and try again, or call us.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-spark-500/60 bg-spark-500/15 p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-spark-500 text-forest-900">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h3 className="mt-3 text-lg font-bold text-forest-950">Ticket raised</h3>
        <p className="mt-1 text-sm text-slate-600">
          Your ticket number is <span className="font-mono font-bold text-forest-800">{done}</span>. Our team will contact you on your email or phone.
          {!user && " For a lost password or ID we'll first confirm it's really your account."}
        </p>
        <button type="button" onClick={() => setDone(null)} className="mt-4 text-sm font-semibold text-forest-700 hover:text-forest-500">
          Raise another ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">What do you need help with?</span>
        <select value={f.category} onChange={(e) => set("category", e.target.value as TicketCategory)} className={field}>
          {ticketCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Full name</span>
        <input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={100} placeholder="Your name" className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Registered email</span>
        <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} maxLength={200} placeholder="you@example.com" className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Mobile number</span>
        <input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} placeholder="98765 43210" className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">
          Student / Tutor ID <span className="font-normal text-slate-400">(if you know it)</span>
        </span>
        <input value={f.memberId} onChange={(e) => set("memberId", e.target.value)} maxLength={10} placeholder="S1234" className={field} />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Details</span>
        <textarea
          value={f.message}
          onChange={(e) => set("message", e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Tell us what happened, e.g. I forgot my password and no longer use that email."
          className={`${field} resize-none`}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Raise ticket"} {!sending && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
