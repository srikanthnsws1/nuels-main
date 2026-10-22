import { createHmac, timingSafeEqual } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

/**
 * Razorpay checkout for course orders (see PAYMENTS-SETUP.md).
 * - RAZORPAY_KEY_ID: the public key ID (rzp_live_… / rzp_test_…), asked for on first deploy.
 * - RAZORPAY_KEY_SECRET: npx firebase-tools functions:secrets:set RAZORPAY_KEY_SECRET
 * The website creates `orders/{id}` (status "pending"); these functions charge the amount
 * computed here from PRICES and, once Razorpay's signature checks out, mark the order paid
 * and add its courses to `users/{uid}.enrolledCourses`.
 */
const razorpayKeyId = defineString("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

/**
 * Built-in course prices in rupees, used when a course has no price in the live catalog
 * (`catalog/{slug}`, edited from the admin panel). Keep in sync with src/data/site.ts.
 */
const PRICES: Record<string, number> = {
  "ui-ux-design-masterclass": 2499,
  "full-stack-web-development-bootcamp": 3999,
  "python-for-data-analysis": 2999,
  "social-media-content-marketing": 1999,
  "business-strategy-for-founders": 3499,
  "spoken-english-communication": 1499,
};

const options = { region: "asia-south1", secrets: [razorpayKeySecret] };

type OrderDoc = { uid: string; courses: string[]; method: string; status: string; razorpayOrderId?: string };

/** Loads the caller's own order, or throws. */
async function ownOrder(uid: string | undefined, orderId: unknown) {
  if (!uid) throw new HttpsError("unauthenticated", "Please log in again.");
  if (typeof orderId !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(orderId)) throw new HttpsError("invalid-argument", "Invalid order.");
  const ref = getFirestore().doc(`orders/${orderId}`);
  const order = (await ref.get()).data() as OrderDoc | undefined;
  if (!order || order.uid !== uid || order.method !== "razorpay") throw new HttpsError("not-found", "Order not found.");
  return { ref, order };
}

export const createRazorpayOrder = onCall(options, async (req) => {
  const { ref, order } = await ownOrder(req.auth?.uid, req.data?.orderId);
  if (order.status !== "pending") throw new HttpsError("failed-precondition", "This order is no longer open.");

  const courses: string[] = Array.isArray(order.courses) ? order.courses : [];
  if (!courses.length || courses.some((slug) => typeof slug !== "string" || !/^[a-z0-9-]{1,60}$/.test(slug))) {
    throw new HttpsError("invalid-argument", "Unknown course in order.");
  }
  const catalog = await getFirestore().getAll(...courses.map((slug) => getFirestore().doc(`catalog/${slug}`)));
  const prices = courses.map((slug, i) => {
    const live = catalog[i].data();
    if (live?.hidden) throw new HttpsError("failed-precondition", "One of these courses is no longer available.");
    const price = typeof live?.price === "number" ? live.price : PRICES[slug];
    if (!(price > 0)) throw new HttpsError("invalid-argument", "Unknown course in order.");
    return price;
  });

  const profile = (await getFirestore().doc(`users/${order.uid}`).get()).data();
  const owned: string[] = Array.isArray(profile?.enrolledCourses) ? profile.enrolledCourses : [];
  if (courses.some((slug) => owned.includes(slug))) throw new HttpsError("already-exists", "You're already enrolled in one of these courses.");

  const amount = prices.reduce((sum, p) => sum + p, 0) * 100; // paise
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpayKeyId.value()}:${razorpayKeySecret.value()}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "INR", receipt: ref.id, notes: { orderId: ref.id, uid: order.uid } }),
  });
  const result = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
  if (!res.ok || !result.id) {
    logger.error("Razorpay order creation failed", { orderId: ref.id, status: res.status, error: result.error });
    throw new HttpsError("unavailable", "Couldn't start the payment. Please try again.");
  }

  await ref.update({ amount: amount / 100, razorpayOrderId: result.id });
  return { keyId: razorpayKeyId.value(), razorpayOrderId: result.id, amount, currency: "INR" };
});

export const verifyRazorpayPayment = onCall(options, async (req) => {
  const { ref, order } = await ownOrder(req.auth?.uid, req.data?.orderId);
  const { razorpay_payment_id: paymentId, razorpay_order_id: razorpayOrderId, razorpay_signature: signature } = req.data ?? {};
  if (order.status === "paid") return { status: "paid" };
  if (typeof paymentId !== "string" || typeof signature !== "string" || razorpayOrderId !== order.razorpayOrderId) {
    throw new HttpsError("invalid-argument", "Payment details don't match this order.");
  }

  const expected = Buffer.from(createHmac("sha256", razorpayKeySecret.value()).update(`${razorpayOrderId}|${paymentId}`).digest("hex"));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    logger.warn("Razorpay signature mismatch", { orderId: ref.id, paymentId });
    throw new HttpsError("permission-denied", "Payment couldn't be verified.");
  }

  // A cancelled order can still be paid if the checkout completed after it was dismissed.
  const batch = getFirestore().batch();
  batch.update(ref, { status: "paid", paymentId, paidAt: FieldValue.serverTimestamp() });
  batch.update(getFirestore().doc(`users/${order.uid}`), {
    enrolledCourses: FieldValue.arrayUnion(...order.courses),
    cart: FieldValue.arrayRemove(...order.courses),
  });
  await batch.commit();
  logger.info("Razorpay payment verified", { orderId: ref.id, paymentId });
  return { status: "paid" };
});
