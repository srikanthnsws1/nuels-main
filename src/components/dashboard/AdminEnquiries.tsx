"use client";

import { useState } from "react";
import { CheckIcon, ClockIcon, MailIcon, PhoneIcon, UsersIcon } from "../icons";
import { Card, CardTitle, EmptyState, StatTiles } from "./ui";
import type { AppUser } from "@/lib/auth";
import { deleteEnquiry, enquiryStatuses, setEnquiryStatus, useEnquiries, type Enquiry, type EnquiryStatus } from "@/lib/enquiries";

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const statusOf = (id: EnquiryStatus) => enquiryStatuses.find((s) => s.id === id) ?? enquiryStatuses[0];

type Filter = "open" | EnquiryStatus;

/** Admin: messages from the Contact page, marked reviewed / contacted / registered / removed. */
export default function AdminEnquiries({ me }: { me: AppUser }) {
  const { rows, error } = useEnquiries();
  const [filter, setFilter] = useState<Filter>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const all = rows ?? [];
  const count = (s: EnquiryStatus) => all.filter((e) => e.status === s).length;
  const shown = all.filter((e) => (filter === "open" ? e.status !== "removed" : e.status === filter));
  const chips: { id: Filter; label: string }[] = [
    { id: "open", label: `All (${all.length - count("removed")})` },
    ...enquiryStatuses.map((s) => ({ id: s.id, label: `${s.label} (${count(s.id)})` })),
  ];

  const run = async (e: Enquiry, job: () => Promise<unknown>) => {
    setBusy(e.id);
    setActionError("");
    try {
      await job();
    } catch (err) {
      console.error("Enquiry update failed", err);
      setActionError("Couldn't update that enquiry. Please try again.");
    } finally {
      setBusy(null);
    }
  };
  const act = (e: Enquiry, value: string) => {
    if (value === "delete") {
      if (window.confirm(`Delete the enquiry from ${e.name} permanently? This can't be undone.`)) run(e, () => deleteEnquiry(e.id));
      return;
    }
    run(e, () => setEnquiryStatus(e.id, value as EnquiryStatus, me.uid));
  };

  return (
    <div className="space-y-6">
      <StatTiles
        stats={[
          { label: "New enquiries", value: rows === null ? "—" : count("new"), icon: MailIcon },
          { label: "Reviewed", value: rows === null ? "—" : count("reviewed"), icon: ClockIcon },
          { label: "Contacted", value: rows === null ? "—" : count("contacted"), icon: PhoneIcon },
          { label: "Registered", value: rows === null ? "—" : count("registered"), icon: UsersIcon },
        ]}
      />

      <Card>
        <CardTitle title="Enquiries" />
        <p className="mt-1 text-sm text-slate-500">Messages sent from the Contact page. Mark each one as you follow it up.</p>

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter enquiries">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={filter === c.id}
              onClick={() => setFilter(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === c.id ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {(error || actionError) && <p className="mt-4 text-sm font-medium text-red-600">{error || actionError}</p>}

        {rows === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading enquiries…</p>
        ) : shown.length === 0 ? (
          <EmptyState icon={MailIcon} title={filter === "open" ? "No enquiries yet" : `No ${statusOf(filter as EnquiryStatus).label.toLowerCase()} enquiries`}>
            Messages from the Contact page appear here.
          </EmptyState>
        ) : (
          <ul className="mt-5 space-y-3">
            {shown.map((e) => {
              const st = statusOf(e.status);
              const digits = e.phone?.replace(/\D/g, "") ?? "";
              const wa = digits.length === 10 ? `91${digits}` : digits;
              return (
                <li key={e.id} className={`rounded-2xl border border-forest-100 p-4 sm:p-5 ${e.status === "new" ? "bg-blue-50/40" : "bg-white"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-forest-950">
                        {e.name}
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.tone}`}>{st.label}</span>
                        <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest-700">{e.topic}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <a href={`mailto:${e.email}`} className="break-all font-medium text-forest-700 hover:text-forest-500">
                          {e.email}
                        </a>
                        {e.phone && (
                          <>
                            <a href={`tel:${e.phone}`} className="font-medium text-forest-700 hover:text-forest-500">
                              {e.phone}
                            </a>
                            {wa.length >= 10 && (
                              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 hover:text-emerald-600">
                                WhatsApp
                              </a>
                            )}
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{e.createdAt ? when.format(e.createdAt.toDate()) : "Just now"}</p>
                    </div>
                    <select
                      value=""
                      disabled={busy === e.id}
                      onChange={(ev) => act(e, ev.target.value)}
                      aria-label={`Actions for the enquiry from ${e.name}`}
                      className="rounded-full border border-forest-200 bg-white px-4 py-2 text-sm font-semibold text-forest-800 outline-none focus:border-forest-400 disabled:opacity-60"
                    >
                      <option value="" disabled>
                        {busy === e.id ? "Saving…" : "Actions"}
                      </option>
                      {enquiryStatuses
                        .filter((s) => s.id !== e.status && !(s.id === "new" && e.status !== "removed"))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {e.status === "removed" && s.id !== "removed" ? `Restore as ${s.label.toLowerCase()}` : s.action}
                          </option>
                        ))}
                      {e.status === "removed" && <option value="delete">Delete permanently</option>}
                    </select>
                  </div>
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-forest-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">{e.message}</p>
                  {e.status === "registered" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-forest-700">
                      <CheckIcon className="h-3.5 w-3.5" /> Converted to a registration
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
