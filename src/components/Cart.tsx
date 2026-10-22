"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, CartIcon, CheckIcon, ClockIcon, LockIcon, PhoneIcon } from "./icons";
import { contactInfo } from "@/data/site";
import { useAuth, type AppUser } from "@/lib/auth";
import {
  awaitingConfirmation,
  cancelOrder,
  coursesFor,
  onlinePaymentsEnabled,
  payOnline,
  placeManualOrder,
  removeFromCart,
  totalFor,
  useMyOrders,
  type Order,
  type PaymentMethod,
} from "@/lib/orders";

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

const statusStyle: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-spark-500/25 text-forest-800",
  cancelled: "bg-slate-100 text-slate-500",
};

function whatsappLink(order: Order) {
  const titles = coursesFor(order.courses)
    .map((c) => c.title)
    .join(", ");
  const text = `Hi Nuel Smart, I placed order ${order.id} for ${titles} (${rupee.format(totalFor(order.courses))}). Please share the payment details.`;
  return `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(text)}`;
}

function OrderCard({ order }: { order: Order }) {
  const [cancelling, setCancelling] = useState(false);
  const items = coursesFor(order.courses);
  const awaiting = awaitingConfirmation(order);
  const status = order.status === "pending" ? (awaiting ? "Awaiting confirmation" : "Payment not completed") : order.status === "paid" ? "Paid" : "Cancelled";

  const cancel = async () => {
    if (!window.confirm("Cancel this order? You can add the courses to your cart again later.")) return;
    setCancelling(true);
    await cancelOrder(order.id).catch((err) => console.error("Could not cancel order", err));
    setCancelling(false);
  };

  return (
    <li className="rounded-2xl border border-forest-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-forest-950">{items.map((c) => c.title).join(", ")}</p>
          <p className="mt-1 text-xs text-slate-500">
            Order <span className="font-mono">{order.id}</span>
            {order.createdAt && ` · ${dateFormat.format(order.createdAt.toDate())}`}
            {" · "}
            {order.method === "razorpay" ? "Online payment" : "Offline payment"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-forest-900">{rupee.format(totalFor(order.courses))}</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[order.status]}`}>{status}</span>
        </div>
      </div>

      {awaiting && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-slate-700">
          <p>
            Pay <strong>{rupee.format(totalFor(order.courses))}</strong> by UPI or bank transfer. Message us on WhatsApp with your order ID for the
            payment details, then send the payment screenshot in the same chat. Your courses unlock as soon as we confirm it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={whatsappLink(order)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-forest-600"
            >
              <PhoneIcon className="h-3.5 w-3.5" /> WhatsApp us
            </a>
            <button
              type="button"
              onClick={cancel}
              disabled={cancelling}
              className="rounded-full px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              {cancelling ? "Cancelling…" : "Cancel order"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Checkout({ user }: { user: AppUser }) {
  const orders = useMyOrders(user.uid);
  const [method, setMethod] = useState<PaymentMethod>(onlinePaymentsEnabled ? "razorpay" : "manual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<"paid" | "placed" | null>(null);

  // Never charge for a course the learner already owns.
  const slugs = user.cart.filter((s) => !user.enrolledCourses.includes(s));
  const items = coursesFor(slugs);
  const total = totalFor(slugs);
  const listPrice = items.reduce((sum, c) => sum + c.oldPrice, 0);

  const checkout = async () => {
    if (!items.length) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      if (method === "razorpay") {
        if ((await payOnline(user, slugs)) === "paid") setResult("paid");
      } else {
        await placeManualOrder(user, slugs);
        setResult("placed");
      }
    } catch (err) {
      console.error("Checkout failed", err);
      setError(
        method === "razorpay"
          ? "We couldn't complete the online payment. If money was deducted, it will be confirmed shortly or refunded. You can also pay offline."
          : "We couldn't place your order. Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const option = (value: PaymentMethod, title: string, detail: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
        method === value ? "border-forest-600 bg-forest-50/70" : "border-forest-100 hover:border-forest-300"
      }`}
    >
      <input
        type="radio"
        name="payment"
        value={value}
        checked={method === value}
        onChange={() => setMethod(value)}
        className="mt-1 h-4 w-4 accent-forest-700"
      />
      <span>
        <span className="block text-sm font-semibold text-forest-950">{title}</span>
        <span className="block text-xs leading-relaxed text-slate-500">{detail}</span>
      </span>
    </label>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {result && (
          <div role="status" className="flex items-start gap-4 rounded-3xl border border-spark-500/60 bg-spark-500/15 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-spark-500 text-forest-900">
              <CheckIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-forest-950">{result === "paid" ? "Payment successful. Your courses are unlocked!" : "Order placed"}</p>
              <p className="mt-1 text-sm text-slate-600">
                {result === "paid"
                  ? "You'll find them under My courses on your dashboard."
                  : "Follow the payment steps under Your orders below. Your courses unlock once we confirm the payment."}
              </p>
              {result === "paid" && (
                <Link href="/dashboard#my-courses" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-forest-700">
                  Go to my courses <ArrowRightIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        )}

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

        {orders && orders.length > 0 && (
          <section id="orders" className="scroll-mt-28 rounded-3xl border border-forest-100 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold tracking-tight text-forest-950">Your orders</h2>
            <ul className="mt-5 space-y-3">
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </ul>
          </section>
        )}
      </div>

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

        <fieldset className="mt-6 space-y-2" disabled={busy}>
          <legend className="mb-2 text-sm font-semibold text-forest-950">Payment method</legend>
          {onlinePaymentsEnabled && option("razorpay", "Pay online", "UPI, cards, netbanking or wallets via Razorpay. Courses unlock instantly.")}
          {option("manual", "Pay offline (UPI / bank transfer)", "Place the order, pay us directly and we unlock your courses once the payment is confirmed.")}
        </fieldset>

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
          ) : method === "razorpay" ? (
            <>
              <LockIcon className="h-4 w-4" /> Pay {rupee.format(total)}
            </>
          ) : (
            <>
              Place order <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ClockIcon className="h-3.5 w-3.5" /> 7-day refund policy on every course
        </p>
      </aside>
    </div>
  );
}

export default function Cart() {
  const { user, ready } = useAuth();

  return (
    <section className="bg-forest-50/60 pb-20 pt-28 sm:pt-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">Cart &amp; checkout</h1>
        <p className="mt-2 text-slate-600">Review your courses and choose how you&apos;d like to pay.</p>

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
