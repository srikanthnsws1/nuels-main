"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, MailIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { authErrorMessage, homeFor, resetPassword, signIn, useAuth, emailForMemberId, isMemberId } from "@/lib/auth";
import { QUIZ_LANDING_KEY } from "@/data/dailyQuiz";

/** Students land on today's Daily Quiz after logging in; everyone else on their dashboard. */
/** Students open on the daily quiz; DailyQuiz moves them to the overview if today's is done or closed. */
function landingFor(role: keyof typeof homeFor) {
  if (role !== "student") return homeFor[role];
  try {
    sessionStorage.setItem(QUIZ_LANDING_KEY, "1");
  } catch {
    /* private mode */
  }
  return "/dashboard#daily-quiz";
}

const field =
  "w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:shadow-lg focus:shadow-forest-900/5";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const { user, ready } = useAuth();

  // Already signed in: go straight to the right dashboard.
  useEffect(() => {
    if (ready && user && !loading) router.replace(landingFor(user.role));
  }, [ready, user, loading, router]);

  const forgot = async () => {
    setAuthError("");
    setResetMsg("");
    const typed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed) && !isMemberId(typed)) {
      setAuthError("Enter your email or ID above, then click “Forgot password?” to get a reset link.");
      return;
    }
    try {
      const target = isMemberId(typed) ? await emailForMemberId(typed) : typed;
      if (target) await resetPassword(target);
      setResetMsg(
        isMemberId(typed)
          ? `If ${typed.toUpperCase()} is registered, we've emailed a reset link to its email address. Check your inbox and spam folder.`
          : `If an account exists for ${typed}, we've emailed a link to reset your password. Check your inbox and spam folder.`,
      );
    } catch (err) {
      setAuthError(authErrorMessage(err));
    }
  };

  const emailError = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !isMemberId(email) ? "Enter your email address or your ID (like S1234)." : "";
  const passwordError = !password ? "Please enter your password." : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setAuthError("");
    if (emailError || passwordError) return;
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password, remember);
      router.push(landingFor(user.role));
    } catch (err) {
      setAuthError(authErrorMessage(err));
      setLoading(false);
    }
  };

  const inputBorder = (error: string) =>
    submitted && error ? "border-red-300 focus:border-red-400" : "border-forest-100 focus:border-forest-300";

  return (
    <Reveal immediate>
      <h2 className="text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">Log in to Nuel Smart</h2>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">Welcome back! Enter your details to continue learning.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-forest-900">
            Email or Student ID
          </label>
          <div className="relative">
            <input
              id="login-email"
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="username"
              placeholder="you@example.com or S1234"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={submitted && !!emailError}
              className={`${field} pr-11 ${inputBorder(emailError)}`}
            />
            <MailIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          {submitted && emailError && <p className="mt-1.5 text-xs font-medium text-red-600">{emailError}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-forest-900">
              Password
            </label>
            <button type="button" onClick={forgot} className="-my-2 py-2 text-xs font-semibold text-forest-600 hover:text-forest-500">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={submitted && !!passwordError}
              className={`${field} pr-12 ${inputBorder(passwordError)}`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50 hover:text-forest-700"
            >
              {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          {submitted && passwordError && <p className="mt-1.5 text-xs font-medium text-red-600">{passwordError}</p>}
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded accent-forest-700"
          />
          Keep me logged in
        </label>

        {resetMsg && (
          <p role="status" className="rounded-2xl bg-forest-50 px-4 py-3 text-sm font-medium text-forest-800">
            {resetMsg}
          </p>
        )}

        {authError && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {authError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-70"
        >
          {loading ? "Logging in…" : "Log in"}
          {!loading && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
        Lost your password or ID, or no longer have that email?{" "}
        <Link href="/support" className="font-semibold text-forest-700 underline hover:text-forest-600">
          Raise a support ticket
        </Link>
      </p>

      <div className="my-8 flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-forest-100" />
        New to Nuel Smart?
        <span className="h-px flex-1 bg-forest-100" />
      </div>

      <Link
        href="/register"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-forest-700 px-7 py-3 text-sm font-semibold text-forest-700 transition hover:bg-forest-700 hover:text-white"
      >
        Create an account (Student or Instructor)
      </Link>

      <div className="mt-6 flex items-center justify-between border-t border-forest-100 pt-5 text-xs text-slate-500">
        <Link href="/tutor/login" className="font-medium hover:text-forest-700">
          Tutor &amp; Mentor Portal →
        </Link>
        <Link href="/admin/login" className="font-medium hover:text-forest-700">
          Admin Portal →
        </Link>
      </div>
    </Reveal>
  );
}
