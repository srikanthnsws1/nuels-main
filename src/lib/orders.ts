"use client";

import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getCatalog, type CatalogCourse } from "./catalog";
import type { AppUser } from "./auth";
import { db, functions } from "./firebase";

/**
 * Cart and orders. The cart is `users/{uid}.cart` (course slugs). Checking out creates
 * `orders/{id}` with status "pending". Courses only move into `users/{uid}.enrolledCourses`
 * when the payment is confirmed: by the verifyRazorpayPayment Cloud Function for online
 * payments, or by an admin marking the order paid. firestore.rules stop learners writing
 * enrolledCourses themselves.
 */
export type OrderStatus = "pending" | "paid" | "rejected" | "cancelled";
export type PaymentMethod = "razorpay" | "manual";

export type Order = {
  id: string;
  uid: string;
  name: string;
  email: string;
  memberId?: string;
  courses: string[];
  amount: number;
  method: PaymentMethod;
  status: OrderStatus;
  paymentId?: string;
  /** Payment screenshot uploaded by the learner (compressed image data URL). */
  screenshot?: string;
  screenshotAt?: Timestamp;
  /** UPI transaction / bank reference number the learner typed in. */
  paymentRef?: string;
  /** Why an admin rejected the payment. A rejected order is closed: the learner can enroll again. */
  rejectReason?: string;
  rejectedAt?: Timestamp;
  /** When the learner dismissed the "payment rejected" pop-up. */
  rejectionSeenAt?: Timestamp;
  createdAt?: Timestamp;
  paidAt?: Timestamp;
};

/** UPI and bank details shown at checkout; admins edit them in `settings/payment`. */
export type PaymentDetails = {
  upiId?: string;
  payeeName?: string;
  qrImage?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  note?: string;
  /** Razorpay Payment Page / payment link (made in the Razorpay dashboard, no API keys needed). */
  razorpayLink?: string;
};

/** Accepts only https links on Razorpay's own domains. */
export const isRazorpayLink = (url?: string) =>
  !!url && /^https:\/\/([a-z0-9-]+\.)*(razorpay\.com|razorpay\.me|rzp\.io)(\/|$)/i.test(url.trim());

/** Online payments show only once the Razorpay key is configured at build time. */
export const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
export const onlinePaymentsEnabled = razorpayKeyId.length > 0;

export const courseBySlug = (slug: string) => getCatalog().find((c) => c.slug === slug);
export const coursesFor = (slugs: string[]) => slugs.map(courseBySlug).filter((c): c is CatalogCourse => !!c);
/** Always priced from the catalog, never from what's stored on an order. */
export const totalFor = (slugs: string[]) => coursesFor(slugs).reduce((sum, c) => sum + c.price, 0);

/**
 * What an order costs: the live catalog price once every course on it is known, otherwise the
 * amount saved on the order (e.g. while the catalog is still loading, or a course was withdrawn).
 */
export const orderAmount = (o: Pick<Order, "courses" | "amount">) =>
  coursesFor(o.courses).length === o.courses.length ? totalFor(o.courses) : o.amount;

/** A manual order that isn't settled yet: waiting for a screenshot or under review. (Rejected orders are closed.) */
export const awaitingConfirmation = (o: Order) => o.method === "manual" && o.status === "pending";
/** The learner still has to upload a payment screenshot. */
export const needsScreenshot = (o: Order) => awaitingConfirmation(o) && !o.screenshot;
/** Rejected orders the learner hasn't been told about yet (shown once as a pop-up). */
export const unseenRejection = (o: Order) => o.status === "rejected" && !o.rejectionSeenAt;

export function addToCart(uid: string, slug: string) {
  return updateDoc(doc(db, "users", uid), { cart: arrayUnion(slug) });
}

/** Adds several courses (e.g. chosen chapters) to the cart at once. */
export function addManyToCart(uid: string, slugs: string[]) {
  return updateDoc(doc(db, "users", uid), { cart: arrayUnion(...slugs) });
}

export function removeFromCart(uid: string, slug: string) {
  return updateDoc(doc(db, "users", uid), { cart: arrayRemove(slug) });
}

export function cancelOrder(orderId: string) {
  return updateDoc(doc(db, "orders", orderId), { status: "cancelled", cancelledAt: serverTimestamp() });
}

function newOrder(user: AppUser, slugs: string[], method: PaymentMethod) {
  return {
    uid: user.uid,
    name: user.name,
    email: user.email,
    ...(user.memberId ? { memberId: user.memberId } : {}),
    courses: slugs,
    amount: totalFor(slugs),
    method,
    status: "pending",
    createdAt: serverTimestamp(),
  };
}

/** Pay offline: the order waits for an admin, and its courses leave the cart meanwhile. */
export async function placeManualOrder(user: AppUser, slugs: string[]) {
  const ref = doc(collection(db, "orders"));
  const batch = writeBatch(db);
  batch.set(ref, newOrder(user, slugs, "manual"));
  batch.update(doc(db, "users", user.uid), { cart: arrayRemove(...slugs) });
  await batch.commit();
  return ref.id;
}

/** Attaches (or replaces) the learner's payment screenshot on a pending order. */
export function submitPaymentProof(orderId: string, screenshot: string, paymentRef: string) {
  return updateDoc(doc(db, "orders", orderId), {
    screenshot,
    screenshotAt: serverTimestamp(),
    paymentRef: paymentRef.trim() || deleteField(),
    status: "pending",
    rejectReason: deleteField(),
  });
}

/**
 * Admin: the payment couldn't be verified. The order closes; the learner sees why (once, as a pop-up,
 * and in their payment history) and can enroll in the same courses again with a new order.
 */
export function rejectOrder(orderId: string, reason: string) {
  return updateDoc(doc(db, "orders", orderId), {
    status: "rejected",
    rejectReason: reason.trim() || "Payment couldn't be verified.",
    rejectedAt: serverTimestamp(),
  });
}

/** Learner: dismisses the "payment rejected" pop-up for this order. */
export function markRejectionSeen(orderId: string) {
  return updateDoc(doc(db, "orders", orderId), { rejectionSeenAt: serverTimestamp() });
}

/** Learner: puts a rejected order's courses (those not already owned) back in the cart. */
export function enrollAgain(user: Pick<AppUser, "uid" | "enrolledCourses">, order: Order) {
  const slugs = order.courses.filter((s) => !user.enrolledCourses.includes(s));
  return slugs.length ? addManyToCart(user.uid, slugs) : Promise.resolve();
}

const paymentDetailsRef = () => doc(db, "settings", "payment");

/** Admin: saves the UPI and bank details learners pay to. */
export function savePaymentDetails(details: PaymentDetails) {
  const clean = Object.fromEntries(Object.entries(details).map(([k, v]) => [k, (v ?? "").trim() || deleteField()]));
  return setDoc(paymentDetailsRef(), clean, { merge: true });
}

/** The UPI and bank details, live; null while loading, {} if none are set. */
export function usePaymentDetails(enabled = true): PaymentDetails | null {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      paymentDetailsRef(),
      (snap) => setDetails((snap.data() as PaymentDetails | undefined) ?? {}),
      (err) => {
        console.warn("Couldn't load payment details", err);
        setDetails({});
      },
    );
  }, [enabled]);
  return details;
}

/** Admin: confirms an offline payment and unlocks the order's courses. */
export async function markOrderPaid(order: Order, adminUid: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "orders", order.id), { status: "paid", paidAt: serverTimestamp(), confirmedBy: adminUid, rejectReason: deleteField() });
  batch.update(doc(db, "users", order.uid), {
    enrolledCourses: arrayUnion(...order.courses),
    cart: arrayRemove(...order.courses),
  });
  await batch.commit();
}

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let checkoutScript: Promise<void> | null = null;

function loadRazorpay() {
  checkoutScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScript = null;
      reject(new Error("Couldn't load Razorpay checkout"));
    };
    document.body.appendChild(script);
  });
  return checkoutScript;
}

const createRazorpayOrder = httpsCallable<{ orderId: string }, { keyId: string; razorpayOrderId: string; amount: number; currency: string }>(
  functions,
  "createRazorpayOrder",
);
const verifyRazorpayPayment = httpsCallable<{ orderId: string } & RazorpayResponse, { status: OrderStatus }>(
  functions,
  "verifyRazorpayPayment",
);

/**
 * Pay online with Razorpay. Resolves "paid" once the server has verified the payment
 * (the courses are unlocked by then), or "dismissed" if the learner closed the checkout.
 */
export async function payOnline(user: AppUser, slugs: string[]): Promise<"paid" | "dismissed"> {
  const ref = doc(collection(db, "orders"));
  await setDoc(ref, newOrder(user, slugs, "razorpay"));
  const [{ data }] = await Promise.all([createRazorpayOrder({ orderId: ref.id }), loadRazorpay()]);
  if (!window.Razorpay) throw new Error("Razorpay checkout unavailable");

  return new Promise((resolve, reject) => {
    new window.Razorpay!({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      order_id: data.razorpayOrderId,
      name: "Nuel Smart",
      description: slugs.length === 1 ? courseBySlug(slugs[0])?.title : `${slugs.length} courses`,
      prefill: { name: user.name, email: user.email },
      notes: { orderId: ref.id },
      theme: { color: "#114b3c" },
      handler: (response: RazorpayResponse) => {
        verifyRazorpayPayment({ orderId: ref.id, ...response }).then(() => resolve("paid"), reject);
      },
      modal: {
        ondismiss: () => {
          cancelOrder(ref.id).catch(() => {});
          resolve("dismissed");
        },
      },
    }).open();
  });
}

// One shared live listener on the signed-in learner's orders.
type OrdersState = { uid: string | null; orders: Order[] | null };
const noOrders: OrdersState = { uid: null, orders: null };
let ordersState = noOrders;
let stopOrders: (() => void) | null = null;
const listeners = new Set<() => void>();

function setOrders(next: OrdersState) {
  ordersState = next;
  listeners.forEach((l) => l());
}

function watchOrders(uid: string | null) {
  if (ordersState.uid === uid) return;
  stopOrders?.();
  stopOrders = null;
  setOrders({ uid, orders: null });
  if (!uid) return;
  stopOrders = onSnapshot(
    query(collection(db, "orders"), where("uid", "==", uid)),
    (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
      orders.sort((a, b) => (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now()));
      setOrders({ uid, orders });
    },
    (err) => {
      console.warn("Couldn't load orders", err);
      setOrders({ uid, orders: [] });
    },
  );
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The learner's orders, newest first; null while loading. */
export function useMyOrders(uid: string | undefined): Order[] | null {
  useEffect(() => watchOrders(uid ?? null), [uid]);
  const s = useSyncExternalStore(subscribe, () => ordersState, () => noOrders);
  return s.uid === (uid ?? null) ? s.orders : null;
}
