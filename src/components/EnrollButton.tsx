"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import EnrollModal from "./EnrollModal";
import { CartIcon, CheckIcon } from "./icons";
import type { Course } from "@/data/site";
import { useAuth } from "@/lib/auth";
import { addToCart, awaitingConfirmation, needsScreenshot, useMyOrders } from "@/lib/orders";

/**
 * "Enroll Now" for a course. Visitors register first (the course then lands in their cart);
 * signed-in learners add it straight to the cart. Once it's in the cart, awaiting payment
 * confirmation or bought, the button links to the cart or dashboard instead.
 */
export default function EnrollButton({ course, className, children }: { course: Course; className: string; children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const orders = useMyOrders(user?.uid);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (user?.enrolledCourses.includes(course.slug)) {
    return (
      <Link href={`/learn/${course.slug}`} className={className}>
        <CheckIcon className="h-4 w-4" /> Enrolled · Open course
      </Link>
    );
  }
  const openOrder = user ? orders?.find((o) => awaitingConfirmation(o) && o.courses.includes(course.slug)) : undefined;
  if (openOrder) {
    return (
      <Link href="/cart#orders" className={className}>
        {needsScreenshot(openOrder) ? "Complete payment" : "Payment under review"}
      </Link>
    );
  }
  if (user?.cart.includes(course.slug)) {
    return (
      <Link href="/cart" className={className}>
        <CartIcon className="h-4 w-4" /> Go to cart
      </Link>
    );
  }

  const enroll = async () => {
    if (!ready) return;
    if (!user) return setOpen(true);
    setAdding(true);
    setFailed(false);
    try {
      await addToCart(user.uid, course.slug);
    } catch (err) {
      console.error("Could not add to cart", err);
      setFailed(true);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <button type="button" onClick={enroll} disabled={adding} className={className}>
        {adding ? "Adding to cart…" : failed ? "Couldn't add. Try again" : children}
      </button>
      {open && <EnrollModal course={course} onClose={close} />}
    </>
  );
}
