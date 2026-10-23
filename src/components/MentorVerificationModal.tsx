"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldIcon } from "./icons";
import { contactInfo } from "@/data/site";

/**
 * Popup for instructor applicants: their account stays under verification until an admin
 * approves it, and only then can they use the mentor dashboard.
 */
export default function MentorVerificationModal({
  email,
  onClose,
  actionLabel = "OK, got it",
}: {
  email?: string;
  onClose: () => void;
  actionLabel?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-forest-950/60 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="mentor-verification-title"
        aria-describedby="mentor-verification-body"
        className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-spark-500/20 text-forest-700">
          <ShieldIcon className="h-8 w-8" />
        </span>
        <h2 id="mentor-verification-title" className="mt-5 text-xl font-bold tracking-tight text-forest-950 sm:text-2xl">
          Your mentor account is under verification
        </h2>
        <div id="mentor-verification-body" className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          <p>
            Thanks for applying to teach on Nuels{email ? <> with <strong className="text-forest-800">{email}</strong></> : null}. Our admin
            team reviews every mentor manually. You&apos;ll be able to log in to the mentor dashboard as soon as your account is
            approved.
          </p>
          <p>
            Questions? Contact the administration department at{" "}
            <a href={contactInfo.phones[0].href} className="font-semibold text-forest-700">
              {contactInfo.phones[0].display}
            </a>{" "}
            or{" "}
            <a href={`mailto:${contactInfo.email}`} className="font-semibold text-forest-700">
              {contactInfo.email}
            </a>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-7 w-full rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-forest-600"
        >
          {actionLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
