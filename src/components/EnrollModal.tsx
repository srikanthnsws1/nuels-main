"use client";

import Image from "next/image";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRightIcon, CheckIcon, CloseIcon, EyeIcon, EyeOffIcon } from "./icons";
import type { Course } from "@/data/site";
import { signIn } from "@/lib/session";

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const strengthStyles = ["bg-forest-100", "bg-red-400", "bg-amber-400", "bg-spark-500", "bg-forest-600"];
const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

type Fields = { name: string; email: string; phone: string; password: string; confirm: string; terms: boolean };
const empty: Fields = { name: "", email: "", phone: "", password: "", confirm: "", terms: false };

function validate(f: Fields) {
  const errors: Partial<Record<keyof Fields, string>> = {};
  if (f.name.trim().length < 2) errors.name = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.email = "Please enter a valid email address.";
  if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(f.phone.replace(/\s/g, ""))) errors.phone = "Please enter a valid 10-digit mobile number.";
  if (!passwordRules.every((r) => r.test(f.password))) errors.password = "Password doesn't meet all the requirements.";
  if (!f.confirm) errors.confirm = "Please confirm your password.";
  else if (f.confirm !== f.password) errors.confirm = "Passwords don't match.";
  if (!f.terms) errors.terms = "Please accept the terms to continue.";
  return errors;
}

const inputBase =
  "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:shadow-lg focus:shadow-forest-900/5";

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-forest-900">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Registration form shown when a learner clicks "Enroll Now" on a course. */
export default function EnrollModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const id = useId();
  const lenis = useLenis();
  const firstInput = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<Fields>(empty);
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const errors = validate(fields);
  const visibleError = (k: keyof Fields) => (touched[k] ? errors[k] : undefined);
  const strength = fields.password ? passwordRules.filter((r) => r.test(fields.password)).length : 0;
  const confirmMatches = fields.confirm.length > 0 && fields.confirm === fields.password;

  // Freeze page scroll behind the dialog, close on Escape, focus the first field.
  useEffect(() => {
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    firstInput.current?.focus();
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [lenis, onClose]);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setFields((f) => ({ ...f, [k]: v }));
  const blur = (k: keyof Fields) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length) {
      setTouched({ name: true, email: true, phone: true, password: true, confirm: true, terms: true });
      return;
    }
    // No backend yet — start a demo session and drop the passwords from memory.
    signIn({ name: fields.name.trim(), email: fields.email.trim() });
    setFields((f) => ({ ...f, password: "", confirm: "" }));
    setDone(true);
  };

  const inputClass = (k: keyof Fields) =>
    `${inputBase} ${visibleError(k) ? "border-red-300 focus:border-red-400" : "border-forest-100 focus:border-forest-300"}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-forest-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        data-lenis-prevent
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl shadow-forest-950/30 sm:max-w-xl sm:rounded-3xl lg:max-w-2xl"
      >
        {/* course summary */}
        <div className="relative flex items-center gap-4 bg-forest-700 p-5 pr-14 sm:p-6 sm:pr-16">
          <div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl sm:block">
            <Image src={course.image} alt="" fill sizes="96px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-spark-400">Enrolling in</p>
            <p className="mt-0.5 truncate font-semibold text-white">{course.title}</p>
            <p className="text-sm text-forest-100">
              by {course.mentor} · <span className="font-semibold text-white">{rupee.format(course.price)}</span>{" "}
              <span className="text-forest-300 line-through">{rupee.format(course.oldPrice)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-10 text-center sm:px-10 sm:py-14">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-spark-500 text-forest-900">
              <CheckIcon className="h-8 w-8" />
            </span>
            <h2 id={`${id}-title`} className="mt-5 text-2xl font-bold tracking-tight text-forest-950">
              You&apos;re registered, {fields.name.trim().split(" ")[0]}!
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
              Your account has been created. We&apos;ve sent the next steps for <strong>{course.title}</strong> to{" "}
              <span className="font-medium text-forest-700">{fields.email}</span>.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-forest-600"
              >
                Go to My Dashboard
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-forest-200 px-7 py-3 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="p-5 sm:p-8">
            <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight text-forest-950 sm:text-2xl">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-slate-600">Register to enroll and start learning with your mentor.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Full name" htmlFor={`${id}-name`} error={visibleError("name")}>
                  <input
                    ref={firstInput}
                    id={`${id}-name`}
                    autoComplete="name"
                    placeholder="Your full name"
                    value={fields.name}
                    onChange={(e) => set("name", e.target.value)}
                    onBlur={blur("name")}
                    aria-invalid={!!visibleError("name")}
                    aria-describedby={visibleError("name") ? `${id}-name-error` : undefined}
                    className={inputClass("name")}
                  />
                </Field>
              </div>
              <Field label="Email" htmlFor={`${id}-email`} error={visibleError("email")}>
                <input
                  id={`${id}-email`}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={fields.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={blur("email")}
                  aria-invalid={!!visibleError("email")}
                  aria-describedby={visibleError("email") ? `${id}-email-error` : undefined}
                  className={inputClass("email")}
                />
              </Field>
              <Field label="Mobile number" htmlFor={`${id}-phone`} error={visibleError("phone")}>
                <input
                  id={`${id}-phone`}
                  type="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={fields.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  onBlur={blur("phone")}
                  aria-invalid={!!visibleError("phone")}
                  aria-describedby={visibleError("phone") ? `${id}-phone-error` : undefined}
                  className={inputClass("phone")}
                />
              </Field>

              <Field label="Create password" htmlFor={`${id}-password`} error={visibleError("password")}>
                <div className="relative">
                  <input
                    id={`${id}-password`}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={fields.password}
                    onChange={(e) => set("password", e.target.value)}
                    onBlur={blur("password")}
                    aria-invalid={!!visibleError("password")}
                    aria-describedby={`${id}-rules`}
                    className={`${inputClass("password")} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50 hover:text-forest-700"
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password" htmlFor={`${id}-confirm`} error={visibleError("confirm")}>
                <div className="relative">
                  <input
                    id={`${id}-confirm`}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={fields.confirm}
                    onChange={(e) => set("confirm", e.target.value)}
                    onBlur={blur("confirm")}
                    aria-invalid={!!visibleError("confirm")}
                    aria-describedby={visibleError("confirm") ? `${id}-confirm-error` : undefined}
                    className={`${inputClass("confirm")} pr-12 ${confirmMatches ? "!border-forest-400" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50 hover:text-forest-700"
                  >
                    {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {confirmMatches && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-forest-600">
                    <CheckIcon className="h-3.5 w-3.5" /> Passwords match
                  </p>
                )}
              </Field>

              {/* strength meter + rule checklist */}
              <div id={`${id}-rules`} className="rounded-2xl bg-forest-50/70 p-4 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="grid flex-1 grid-cols-4 gap-1.5">
                    {passwordRules.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-colors ${i < strength ? strengthStyles[strength] : "bg-forest-100"}`}
                      />
                    ))}
                  </div>
                  <span className="w-12 text-right text-xs font-semibold text-forest-700">{strengthLabels[strength]}</span>
                </div>
                <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
                  {passwordRules.map((r) => {
                    const ok = r.test(fields.password);
                    return (
                      <li key={r.label} className={`flex items-center gap-2 ${ok ? "text-forest-700" : "text-slate-500"}`}>
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full ${
                            ok ? "bg-forest-600 text-white" : "border border-slate-300"
                          }`}
                        >
                          {ok && <CheckIcon className="h-3 w-3" />}
                        </span>
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={fields.terms}
                    onChange={(e) => {
                      set("terms", e.target.checked);
                      blur("terms")();
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-forest-700"
                  />
                  <span>
                    I agree to the <span className="font-medium text-forest-700">Terms &amp; Conditions</span> and{" "}
                    <span className="font-medium text-forest-700">Privacy Policy</span>.
                  </span>
                </label>
                {visibleError("terms") && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.terms}</p>}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-sm text-slate-500 sm:text-left">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-forest-700 hover:text-forest-500">
                  Log in
                </Link>
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600"
              >
                Register &amp; Enroll
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
