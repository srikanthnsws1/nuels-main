"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ArrowRightIcon, CameraIcon, CartIcon, CheckIcon, ClockIcon, LockIcon } from "./icons";
import { useAuth, type AppUser } from "@/lib/auth";
import { compressImage } from "@/lib/image";
import {
  awaitingConfirmation,
  cancelOrder,
  coursesFor,
  needsScreenshot,
  onlinePaymentsEnabled,
  payOnline,
  placeManualOrder,
  removeFromCart,
  submitPaymentProof,
  totalFor,
  useMyOrders,
  usePaymentDetails,
  type Order,
  type PaymentDetails,
  type PaymentMethod,
} from "@/lib/orders";

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

const statusStyle: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-spark-500/25 text-forest-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function statusLabel(o: Order) {
  if (o.status === "paid") return "Approved";
  if (o.status === "cancelled") return "Cancelled";
  if (o.status === "rejected") return "Screenshot rejected";
  if (o.method === "razorpay") return "Payment not completed";
  return o.screenshot ? "Under review" : "Awaiting payment";
}

function CopyRow({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = () => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="break-all font-semibold text-forest-950">{value}</dd>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-full border border-forest-100 px-3 py-1 text-xs font-semibold text-forest-700 transition hover:bg-forest-50"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function PaymentInstructions({ order, details }: { order: Order; details: PaymentDetails | null }) {
  const amount = totalFor(order.courses);
  if (details === null) return <p className="text-sm text-slate-500">Loading payment details…</p>;

  const hasUpi = !!details.upiId;
  const hasBank = !!details.accountNumber;
  if (!hasUpi && !hasBank) {
    return (
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Payment details are being updated. Please check back shortly or contact us from the Contact page.
      </p>
    );
  }

  const upiLink = hasUpi
    ? `upi://pay?${new URLSearchParams({ pa: details.upiId!, pn: details.payeeName || "Nuel Smart", am: String(amount), cu: "INR", tn: `Order ${order.id}` })}`
    : "";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {hasUpi && (
        <div className="rounded-2xl border border-forest-100 bg-white p-4">
          <p className="text-sm font-bold text-forest-950">Pay by UPI</p>
          {details.qrImage && (
            // eslint-disable-next-line @next/next/no-img-element -- QR code stored as a data URL
            <img src={details.qrImage} alt="UPI QR code" className="mx-auto mt-3 h-44 w-44 rounded-xl border border-forest-100 object-contain" />
          )}
          <dl className="mt-2 divide-y divide-forest-100">
            <CopyRow label="UPI ID" value={details.upiId} />
            <CopyRow label="Name" value={details.payeeName} />
          </dl>
          <a
            href={upiLink}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-600 md:hidden"
          >
            Pay {rupee.format(amount)} with a UPI app
          </a>
        </div>
      )}
      {hasBank && (
        <div className="rounded-2xl border border-forest-100 bg-white p-4">
          <p className="text-sm font-bold text-forest-950">Pay by bank transfer</p>
          <dl className="mt-2 divide-y divide-forest-100">
            <CopyRow label="Account name" value={details.accountName} />
            <CopyRow label="Account number" value={details.accountNumber} />
            <CopyRow label="IFSC" value={details.ifsc} />
            <CopyRow label="Bank" value={[details.bankName, details.branch].filter(Boolean).join(", ")} />
          </dl>
        </div>
      )}
      {details.note && <p className="text-xs leading-relaxed text-slate-500 md:col-span-2">{details.note}</p>}
    </div>
  );
}

function ProofUpload({ order, onDone }: { order: Order; onDone?: () => void }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState("");
  const [paymentRef, setPaymentRef] = useState(order.paymentRef ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      setImage(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that image.");
    }
  };

  const submit = async () => {
    if (!image) return setError("Please upload your payment screenshot.");
    setBusy(true);
    setError("");
    try {
      await submitPaymentProof(order.id, image, paymentRef);
      setImage("");
      onDone?.();
    } catch (err) {
      console.error("Could not upload screenshot", err);
      setError("Couldn't upload the screenshot. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-forest-100 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-40 w-full shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-forest-200 bg-forest-50/60 text-sm font-semibold text-forest-700 transition hover:border-forest-400 sm:w-40"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img src={image} alt="Payment screenshot preview" className="h-full w-full object-cover" />
          ) : (
            <>
              <CameraIcon className="h-6 w-6" />
              Upload screenshot
            </>
          )}
        </button>
        <div className="flex-1">
          <label htmlFor={`${id}-ref`} className="mb-1.5 block text-sm font-medium text-forest-900">
            UPI transaction ID / UTR <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id={`${id}-ref`}
            value={paymentRef}
            maxLength={40}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="e.g. 412345678901"
            className="w-full rounded-2xl border border-forest-100 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300"
          />
          <p className="mt-2 text-xs text-slate-500">
            The screenshot should show the amount, date and transaction ID. {image && "Tap the image to choose a different one."}
          </p>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy || !image}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Submit for approval"}
            {!busy && <ArrowRightIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** An unsettled offline order: pay, upload the screenshot, wait for approval. */
function OpenOrder({ order, details }: { order: Order; details: PaymentDetails | null }) {
  const [cancelling, setCancelling] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const items = coursesFor(order.courses);
  const amount = totalFor(order.courses);
  const underReview = !needsScreenshot(order) && !replacing;

  const cancel = async () => {
    if (!window.confirm("Cancel this order? You can add the courses to your cart again later.")) return;
    setCancelling(true);
    await cancelOrder(order.id).catch((err) => console.error("Could not cancel order", err));
    setCancelling(false);
  };

  const step = (n: number, title: string, done = false) => (
    <p className="flex items-center gap-2 text-sm font-bold text-forest-950">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${done ? "bg-spark-500 text-forest-900" : "bg-forest-700 text-white"}`}
      >
        {done ? <CheckIcon className="h-3.5 w-3.5" /> : n}
      </span>
      {title}
    </p>
  );

  return (
    <li className="rounded-3xl border border-forest-100 bg-forest-50/50 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-forest-950">{items.map((c) => c.title).join(", ")}</p>
          <p className="mt-1 text-xs text-slate-500">
            Order <span className="font-mono">{order.id}</span>
            {order.createdAt && ` · ${dateFormat.format(order.createdAt.toDate())}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-forest-900">{rupee.format(amount)}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[order.status]}`}>{statusLabel(order)}</span>
        </div>
      </div>

      {underReview ? (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          {order.screenshot && (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded screenshot
            <img src={order.screenshot} alt="Your payment screenshot" className="h-28 w-28 shrink-0 rounded-xl border border-amber-200 object-cover" />
          )}
          <div className="flex-1 text-sm text-slate-700">
            <p className="flex items-center gap-2 font-semibold text-forest-950">
              <ClockIcon className="h-4 w-4 text-amber-600" /> Payment under review
            </p>
            <p className="mt-1">
              We&apos;ve received your screenshot{order.paymentRef && <> (ref. {order.paymentRef})</>}. Your full dashboard unlocks as soon as we approve
              it.
            </p>
            <button type="button" onClick={() => setReplacing(true)} className="mt-2 text-xs font-semibold text-forest-700 hover:text-forest-500">
              Uploaded the wrong image? Replace it
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {order.status === "rejected" && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>Your screenshot was not approved:</strong> {order.rejectReason || "the payment couldn't be verified."} Please upload a clear
              screenshot of a successful payment.
            </p>
          )}
          <div className="space-y-3">
            {step(1, `Pay ${rupee.format(amount)} using UPI or bank transfer`)}
            <PaymentInstructions order={order} details={details} />
          </div>
          <div className="space-y-3">
            {step(2, "Upload your payment screenshot")}
            <ProofUpload order={order} onDone={() => setReplacing(false)} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {replacing && (
          <button type="button" onClick={() => setReplacing(false)} className="text-xs font-semibold text-slate-600 hover:text-forest-700">
            Keep the current screenshot
          </button>
        )}
        {!order.screenshot && (
          <button
            type="button"
            onClick={cancel}
            disabled={cancelling}
            className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel order"}
          </button>
        )}
      </div>
    </li>
  );
}

function PastOrder({ order }: { order: Order }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-forest-100 p-4">
      <div className="min-w-0">
        <p className="font-semibold text-forest-950">
          {coursesFor(order.courses)
            .map((c) => c.title)
            .join(", ")}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Order <span className="font-mono">{order.id}</span>
          {order.createdAt && ` · ${dateFormat.format(order.createdAt.toDate())}`}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-forest-900">{rupee.format(totalFor(order.courses))}</p>
        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[order.status]}`}>{statusLabel(order)}</span>
      </div>
    </li>
  );
}

function Checkout({ user }: { user: AppUser }) {
  const orders = useMyOrders(user.uid);
  const [method, setMethod] = useState<PaymentMethod>("manual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paidOnline, setPaidOnline] = useState(false);

  const open = (orders ?? []).filter(awaitingConfirmation);
  const past = (orders ?? []).filter((o) => !awaitingConfirmation(o) && !(o.method === "razorpay" && o.status !== "paid"));
  const details = usePaymentDetails(open.length > 0);

  // Never charge for a course the learner already owns.
  const slugs = user.cart.filter((s) => !user.enrolledCourses.includes(s));
  const items = coursesFor(slugs);
  const total = totalFor(slugs);
  const listPrice = items.reduce((sum, c) => sum + c.oldPrice, 0);

  const checkout = async () => {
    if (!items.length) return;
    setBusy(true);
    setError("");
    setPaidOnline(false);
    try {
      if (method === "razorpay") {
        if ((await payOnline(user, slugs)) === "paid") setPaidOnline(true);
      } else {
        await placeManualOrder(user, slugs);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Checkout failed", err);
      setError(
        method === "razorpay"
          ? "We couldn't complete the online payment. If money was deducted, it will be confirmed shortly or refunded."
          : "We couldn't place your order. Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {paidOnline && (
        <div role="status" className="flex items-start gap-4 rounded-3xl border border-spark-500/60 bg-spark-500/15 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-spark-500 text-forest-900">
            <CheckIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-forest-950">Payment successful. Your courses are unlocked!</p>
            <Link href="/dashboard#my-courses" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-forest-700">
              Go to my courses <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {open.length > 0 && (
        <section id="orders" className="scroll-mt-28 rounded-3xl border border-forest-100 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold tracking-tight text-forest-950">Complete your payment</h2>
          <p className="mt-1 text-sm text-slate-600">Pay, upload the screenshot, and we&apos;ll unlock your courses once it&apos;s approved.</p>
          <ul className="mt-5 space-y-4">
            {open.map((o) => (
              <OpenOrder key={o.id} order={o} details={details} />
            ))}
          </ul>
        </section>
      )}

      {(items.length > 0 || open.length === 0) && (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-3xl border border-forest-100 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold tracking-tight text-forest-950">
              Your cart{items.length > 0 && <span className="ml-2 text-sm font-medium text-slate-500">({items.length})</span>}
            </h2>
            {items.length === 0 ? (
              <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-forest-200 px-4 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                  <CartIcon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-forest-950">Your cart is empty</p>
                <p className="mt-1 text-xs text-slate-500">Add a course with its Enroll Now button.</p>
                <Link
                  href="/courses"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-600"
                >
                  Browse courses <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-forest-100">
                {items.map((c) => (
                  <li key={c.slug} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <Link href={`/courses/${c.slug}`} className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-32">
                      <Image src={c.image} alt="" fill sizes="128px" className="object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link href={`/courses/${c.slug}`} className="font-semibold leading-snug text-forest-950 hover:text-forest-600">
                          {c.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          by {c.mentor} · {c.level} · {c.lessons} lessons
                        </p>
                        <button
                          type="button"
                          onClick={() => removeFromCart(user.uid, c.slug).catch((err) => console.error("Could not remove", err))}
                          disabled={busy}
                          className="mt-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="sm:text-right">
                        <p className="font-bold text-forest-900">{rupee.format(c.price)}</p>
                        <p className="text-xs text-slate-400 line-through">{rupee.format(c.oldPrice)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="rounded-3xl border border-forest-100 bg-white p-5 shadow-xl shadow-forest-900/5 sm:p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold tracking-tight text-forest-950">Order summary</h2>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>Price ({items.length} {items.length === 1 ? "course" : "courses"})</dt>
                <dd>{rupee.format(listPrice)}</dd>
              </div>
              <div className="flex justify-between text-forest-600">
                <dt>Discount</dt>
                <dd>−{rupee.format(listPrice - total)}</dd>
              </div>
              <div className="flex justify-between border-t border-forest-100 pt-3 text-base font-bold text-forest-950">
                <dt>Total</dt>
                <dd>{rupee.format(total)}</dd>
              </div>
            </dl>

            {onlinePaymentsEnabled && (
              <fieldset className="mt-6 space-y-2" disabled={busy}>
                <legend className="mb-2 text-sm font-semibold text-forest-950">Payment method</legend>
                {(
                  [
                    ["manual", "UPI / bank transfer", "Pay to our UPI ID or bank account and upload the screenshot."],
                    ["razorpay", "Pay online", "Cards, netbanking or wallets via Razorpay. Unlocks instantly."],
                  ] as const
                ).map(([value, title, detail]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      method === value ? "border-forest-600 bg-forest-50/70" : "border-forest-100 hover:border-forest-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={method === value}
                      onChange={() => setMethod(value)}
                      className="mt-1 h-4 w-4 accent-forest-700"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-forest-950">{title}</span>
                      <span className="block text-xs leading-relaxed text-slate-500">{detail}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={checkout}
              disabled={busy || items.length === 0}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-60"
            >
              {busy ? (
                "Please wait…"
              ) : (
                <>
                  <LockIcon className="h-4 w-4" /> {method === "razorpay" ? `Pay ${rupee.format(total)}` : "Proceed to payment"}
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
              {method === "manual"
                ? "Next you'll see our UPI and bank details. Your courses unlock after we approve your payment screenshot."
                : "7-day refund policy on every course."}
            </p>
          </aside>
        </div>
      )}

      {past.length > 0 && (
        <section className="rounded-3xl border border-forest-100 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold tracking-tight text-forest-950">Order history</h2>
          <ul className="mt-5 space-y-3">
            {past.map((o) => (
              <PastOrder key={o.id} order={o} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function Cart() {
  const { user, ready } = useAuth();

  return (
    <section className="bg-forest-50/60 pb-20 pt-28 sm:pt-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">Cart &amp; checkout</h1>
        <p className="mt-2 text-slate-600">Review your courses, pay, and upload your payment screenshot.</p>

        <div className="mt-8">
          {!ready ? (
            <div className="flex justify-center py-20">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" aria-label="Loading" />
            </div>
          ) : !user ? (
            <div className="rounded-3xl border border-forest-100 bg-white px-5 py-14 text-center">
              <p className="font-semibold text-forest-950">Log in to see your cart</p>
              <p className="mt-1 text-sm text-slate-500">Your cart is saved to your account.</p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/login" className="rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-forest-600">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full border border-forest-200 px-7 py-3 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
                >
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <Checkout user={user} />
          )}
        </div>
      </div>
    </section>
  );
}
