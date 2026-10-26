"use client";

import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CartIcon, CheckIcon, CloseIcon } from "../icons";
import { Card, CardTitle, EmptyState, rupee } from "./ui";
import type { AppUser } from "@/lib/auth";
import { useCatalog } from "@/lib/catalog";
import { db } from "@/lib/firebase";
import { compressImage } from "@/lib/image";
import { cancelOrder, coursesFor, markOrderPaid, rejectOrder, savePaymentDetails, totalFor, usePaymentDetails, type Order, type PaymentDetails, isRazorpayLink } from "@/lib/orders";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const statusStyle: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-spark-500/25 text-forest-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const statusLabel = (o: Order) =>
  o.status === "paid" ? "Approved" : o.status === "pending" ? (o.screenshot ? "To review" : "Awaiting payment") : o.status === "rejected" ? "Rejected" : "Cancelled";

type Filter = "review" | "waiting" | "all";
const filters: { id: Filter; label: string; test: (o: Order) => boolean }[] = [
  { id: "review", label: "To review", test: (o) => o.status === "pending" && !!o.screenshot },
  { id: "waiting", label: "Awaiting payment", test: (o) => (o.status === "pending" && !o.screenshot) || o.status === "rejected" },
  { id: "all", label: "All", test: () => true },
];

function Screenshot({ order, onClose }: { order: Order; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      data-lenis-prevent
    >
      <div className="relative max-h-full max-w-3xl overflow-auto rounded-3xl bg-white p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-forest-700 shadow"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded screenshot data URL */}
        <img src={order.screenshot} alt={`Payment screenshot from ${order.name}`} className="max-h-[80dvh] w-auto rounded-2xl" />
        <p className="px-2 pb-1 pt-3 text-sm text-slate-600">
          <strong className="text-forest-950">{order.name}</strong> · {rupee.format(totalFor(order.courses))}
          {order.paymentRef && <> · Ref. {order.paymentRef}</>}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** Every order with its payment screenshot; approving one unlocks the student's courses. */
export function OrdersCard({ me, canApprove = true }: { me: AppUser; canApprove?: boolean }) {
  useCatalog(true); // re-render with live course names and prices
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Filter>("review");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<Order | null>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "orders"),
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
          const at = (o: Order) => (o.screenshotAt ?? o.createdAt)?.toMillis() ?? 0;
          rows.sort((a, b) => at(b) - at(a));
          setOrders(rows);
        },
        () => setError("Couldn't load orders. Make sure the Firestore rules are deployed."),
      ),
    [],
  );

  const current = filters.find((f) => f.id === filter)!;
  const visible = (orders ?? []).filter(current.test);
  const count = (f: (typeof filters)[number]) => (orders ?? []).filter(f.test).length;

  const run = async (order: Order, job: () => Promise<void>) => {
    setBusy(order.id);
    setError("");
    try {
      await job();
    } catch {
      setError("Couldn't update that order. Check your connection and Firestore rules.");
    } finally {
      setBusy(null);
    }
  };

  const accept = (o: Order) => {
    if (!window.confirm(`Accept ${rupee.format(totalFor(o.courses))} from ${o.name}? Their courses and full dashboard unlock immediately.`)) return;
    run(o, () => markOrderPaid(o, me.uid));
  };
  const reject = (o: Order) => {
    const reason = window.prompt(`Reject the payment from ${o.name}? Tell them why (they'll see this and can upload again):`, "Payment not received");
    if (reason === null) return;
    run(o, () => rejectOrder(o.id, reason));
  };
  const cancel = (o: Order) => {
    if (!window.confirm(`Cancel order ${o.id} from ${o.name}?`)) return;
    run(o, () => cancelOrder(o.id));
  };

  return (
    <Card id="orders">
      <CardTitle title="Payments & orders" />
      <p className="mt-1 text-sm text-slate-500">
        {canApprove
          ? "Check each screenshot against your bank or UPI app, then accept it to give the student full access."
          : "Payments and their screenshots. Approving them needs the “Accept or reject payments” permission."}
      </p>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === f.id ? "bg-forest-700 text-white" : "border border-forest-100 text-slate-600 hover:bg-forest-50"
            }`}
          >
            {f.label}
            {orders && <span className="ml-1.5 opacity-70">{count(f)}</span>}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

      {orders === null && !error ? (
        <p className="mt-6 text-sm text-slate-500">Loading orders…</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={CartIcon} title={filter === "review" ? "No payment screenshots to review" : "No orders here"} />
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((o) => (
            <li key={o.id} className="flex gap-4 rounded-2xl border border-forest-100 p-3">
              {o.screenshot ? (
                <button
                  type="button"
                  onClick={() => setViewing(o)}
                  className="h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-forest-100 transition hover:opacity-80"
                  aria-label={`View payment screenshot from ${o.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded screenshot data URL */}
                  <img src={o.screenshot} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <span className="flex h-32 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-forest-200 px-2 text-center text-xs text-slate-400">
                  {o.method === "razorpay" ? "Online payment" : "No screenshot yet"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-forest-950">{o.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle[o.status]}`}>{statusLabel(o)}</span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  {o.memberId && <span className="font-mono font-semibold text-forest-700">{o.memberId} · </span>}
                  {o.email}
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                  {coursesFor(o.courses)
                    .map((c) => c.title)
                    .join(", ")}
                </p>
                <p className="mt-1 text-sm font-bold text-forest-700">
                  {rupee.format(totalFor(o.courses))}
                  {o.paymentRef && <span className="ml-2 font-mono text-xs font-normal text-slate-500">Ref. {o.paymentRef}</span>}
                </p>
                <p className="text-[11px] text-slate-400">
                  {(o.screenshotAt ?? o.createdAt) && dateFormat.format((o.screenshotAt ?? o.createdAt)!.toDate())}
                </p>
                {o.status === "rejected" && o.rejectReason && <p className="mt-1 text-xs text-red-600">Rejected: {o.rejectReason}</p>}

                {o.status === "pending" && canApprove && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {o.screenshot && (
                      <>
                        <button
                          type="button"
                          onClick={() => accept(o)}
                          disabled={busy === o.id}
                          className="inline-flex items-center gap-1 rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-600 disabled:opacity-50"
                        >
                          <CheckIcon className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(o)}
                          disabled={busy === o.id}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {!o.screenshot && (
                      <button
                        type="button"
                        onClick={() => cancel(o)}
                        disabled={busy === o.id}
                        className="rounded-full px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Cancel order
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewing && <Screenshot order={viewing} onClose={() => setViewing(null)} />}
    </Card>
  );
}

const fields: { key: Exclude<keyof PaymentDetails, "qrImage" | "note">; label: string; placeholder: string }[] = [
  { key: "upiId", label: "UPI ID", placeholder: "yourname@okhdfcbank" },
  { key: "payeeName", label: "Name shown for UPI", placeholder: "Nuel Smart" },
  { key: "accountName", label: "Account holder name", placeholder: "As printed on the passbook" },
  { key: "accountNumber", label: "Account number", placeholder: "" },
  { key: "ifsc", label: "IFSC code", placeholder: "HDFC0001234" },
  { key: "bankName", label: "Bank name", placeholder: "HDFC Bank" },
  { key: "branch", label: "Branch", placeholder: "Hyderabad" },
  { key: "razorpayLink", label: "Razorpay payment page link (optional)", placeholder: "https://rzp.io/l/nuelsmart" },
];

/** The UPI and bank details students see at checkout. */
export function PaymentDetailsCard() {
  const id = useId();
  const saved = usePaymentDetails();
  const [form, setForm] = useState<PaymentDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const qrRef = useRef<HTMLInputElement>(null);

  const values = form ?? saved ?? {};
  const set = (k: keyof PaymentDetails, v: string) => {
    setForm({ ...values, [k]: v });
    setMessage(null);
  };

  const pickQr = async (file?: File) => {
    if (!file) return;
    try {
      set("qrImage", await compressImage(file, { maxSide: 600, type: "image/png" }));
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't read that image." });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values.upiId?.trim() && !values.accountNumber?.trim() && !values.razorpayLink?.trim()) {
      return setMessage({ ok: false, text: "Add at least a UPI ID, a bank account number or a Razorpay payment link." });
    }
    if (values.razorpayLink?.trim() && !isRazorpayLink(values.razorpayLink)) {
      return setMessage({ ok: false, text: "The Razorpay link should start with https://rzp.io/, https://razorpay.me/ or https://pages.razorpay.com/." });
    }
    setSaving(true);
    try {
      await savePaymentDetails(values);
      setForm(null);
      setMessage({ ok: true, text: "Saved. Students will see these details at checkout." });
    } catch {
      setMessage({ ok: false, text: "Couldn't save. Make sure the Firestore rules are deployed." });
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-2xl border border-forest-100 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";

  return (
    <Card id="payment-details">
      <CardTitle title="Your payment details" />
      <p className="mt-1 text-sm text-slate-500">Students pay to these after checkout, then upload a screenshot for you to approve.</p>

      {saved === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={submit} className="mt-5 grid gap-6 lg:grid-cols-[1fr_220px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key}>
                <label htmlFor={`${id}-${f.key}`} className="mb-1.5 block text-sm font-medium text-forest-900">
                  {f.label}
                </label>
                <input
                  id={`${id}-${f.key}`}
                  value={values[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={input}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-note`} className="mb-1.5 block text-sm font-medium text-forest-900">
                Note for students <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id={`${id}-note`}
                rows={2}
                value={values.note ?? ""}
                placeholder="e.g. Payments are approved within 24 hours."
                onChange={(e) => set("note", e.target.value)}
                className={input}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-forest-900">UPI QR code</p>
            <button
              type="button"
              onClick={() => qrRef.current?.click()}
              className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-forest-200 bg-forest-50/60 text-sm font-semibold text-forest-700 transition hover:border-forest-400"
            >
              {values.qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- QR data URL
                <img src={values.qrImage} alt="UPI QR code" className="h-full w-full object-contain p-2" />
              ) : (
                "Upload QR image"
              )}
            </button>
            {values.qrImage && (
              <button type="button" onClick={() => set("qrImage", "")} className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700">
                Remove QR
              </button>
            )}
            <input
              ref={qrRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pickQr(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
            <button
              type="submit"
              disabled={saving || form === null}
              className="rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save payment details"}
            </button>
            {message && <p className={`text-sm font-medium ${message.ok ? "text-forest-700" : "text-red-600"}`}>{message.text}</p>}
          </div>
        </form>
      )}
    </Card>
  );
}
