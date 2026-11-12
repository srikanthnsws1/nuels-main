"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloseIcon } from "./icons";
import type { AppUser } from "@/lib/auth";
import { courseTitle } from "@/lib/catalog";
import { coursesFor, enrollAgain, markRejectionSeen, orderAmount, unseenRejection, type Order } from "@/lib/orders";

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

const statusStyle: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-spark-500/25 text-forest-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};
const statusText = (o: Order) =>
  o.status === "paid" ? "Approved" : o.status === "rejected" ? "Payment rejected" : o.status === "cancelled" ? "Cancelled" : o.screenshot ? "Under review" : "Awaiting payment";

const titles = (o: Order) => coursesFor(o.courses).map(courseTitle).join(", ") || "Course details loading…";

/** Puts a rejected order's courses back in the cart and opens it. */
function useEnrollAgain(user: AppUser) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (o: Order) => {
    setBusy(o.id);
    try {
      await enrollAgain(user, o);
      if (unseenRejection(o)) await markRejectionSeen(o.id).catch(() => {});
      router.push("/cart");
    } catch (err) {
      console.error("Could not add the courses again", err);
      setBusy(null);
    }
  };
  return { busy, run };
}

/** Settled orders (approved, rejected, cancelled), newest first, with the reason for any rejection. */
export function PaymentHistoryList({ user, orders }: { user: AppUser; orders: Order[] }) {
  const again = useEnrollAgain(user);
  return (
    <ul className="space-y-3">
      {orders.map((o) => {
        const canEnroll = o.status === "rejected" && o.courses.some((s) => !user.enrolledCourses.includes(s) && !user.cart.includes(s));
        return (
          <li key={o.id} className="rounded-2xl border border-forest-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-forest-950">{titles(o)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Order <span className="font-mono">{o.id}</span>
                  {o.createdAt && ` · ${dateFormat.format(o.createdAt.toDate())}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-forest-900">{rupee.format(orderAmount(o))}</p>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[o.status]}`}>{statusText(o)}</span>
              </div>
            </div>
            {o.status === "rejected" && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                <p>
                  <strong>Reason:</strong> {o.rejectReason || "The payment couldn't be verified."}
                </p>
                {canEnroll && (
                  <button
                    type="button"
                    onClick={() => again.run(o)}
                    disabled={again.busy === o.id}
                    className="rounded-full bg-forest-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-forest-600 disabled:opacity-60"
                  >
                    {again.busy === o.id ? "Adding…" : "Enroll again"}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Shown once after an admin rejects a payment: why, and a way to enroll again. */
export function RejectedPaymentPopup({ user, orders }: { user: AppUser; orders: Order[] }) {
  const pending = orders.filter(unseenRejection);
  const [closing, setClosing] = useState(false);
  const again = useEnrollAgain(user);
  if (!pending.length) return null;
  const o = pending[0];
  const dismiss = async () => {
    setClosing(true);
    await markRejectionSeen(o.id).catch((err) => console.error("Could not dismiss notice", err));
    setClosing(false);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-950/70 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="rejected-title">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button type="button" onClick={dismiss} disabled={closing} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <CloseIcon className="h-5 w-5" />
        </button>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <CloseIcon className="h-7 w-7" />
        </span>
        <h2 id="rejected-title" className="mt-4 text-xl font-bold text-forest-950">
          Your payment was not approved
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          We couldn&apos;t verify your payment of <strong>{rupee.format(orderAmount(o))}</strong> for <strong>{titles(o)}</strong>, so this order has been
          closed.
        </p>
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Reason:</strong> {o.rejectReason || "The payment couldn't be verified."}
        </p>
        <p className="mt-3 text-sm text-slate-600">
          You can enroll again and pay with a clear screenshot of a successful payment. Your order history keeps this record.
          {pending.length > 1 && ` (${pending.length - 1} more notice${pending.length > 2 ? "s" : ""} after this.)`}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={dismiss} disabled={closing} className="rounded-full border-2 border-forest-700 py-2.5 text-sm font-semibold text-forest-700 hover:bg-forest-50 disabled:opacity-60">
            OK
          </button>
          <button
            type="button"
            onClick={() => again.run(o)}
            disabled={again.busy === o.id}
            className="rounded-full bg-forest-700 py-2.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
          >
            {again.busy === o.id ? "Adding…" : "Enroll again"}
          </button>
        </div>
      </div>
    </div>
  );
}
