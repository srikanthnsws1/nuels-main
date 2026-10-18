"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, MailIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { nameFromEmail, signIn } from "@/lib/session";

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

  const emailError = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Please enter a valid email address." : "";
  const passwordError = !password ? "Please enter your password." : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (emailError || passwordError) return;
    setLoading(true);
    // Demo sign-in: no backend yet, so any well-formed credentials open the dashboard.
    signIn({ name: nameFromEmail(email), email });
    router.push("/dashboard");
  };

  const inputBorder = (error: string) =>
    submitted && error ? "border-red-300 focus:border-red-400" : "border-forest-100 focus:border-forest-300";

  return (
    <Reveal immediate>
      <h2 className="text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">Log in to Nuels</h2>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">Welcome back! Enter your details to continue learning.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-forest-900">
            Email
          </label>
          <div className="relative">
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
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
            <a href="#" className="text-xs font-semibold text-forest-600 hover:text-forest-500">
              Forgot password?
            </a>
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

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-70"
        >
          {loading ? "Logging in…" : "Log in"}
          {!loading && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </form>

      <div className="my-8 flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-forest-100" />
        New to Nuels?
        <span className="h-px flex-1 bg-forest-100" />
      </div>

      <Link
        href="/courses"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-forest-700 px-7 py-3 text-sm font-semibold text-forest-700 transition hover:bg-forest-700 hover:text-white"
      >
        Browse courses &amp; create an account
      </Link>
    </Reveal>
  );
}
