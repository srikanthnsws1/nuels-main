"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, MailIcon, ShieldIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { authErrorMessage, signIn, signOut } from "@/lib/auth";

const field =
  "w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:shadow-lg focus:shadow-forest-900/10";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const emailError = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Please enter a valid administrator email." : "";
  const passwordError = !password ? "Please enter your password." : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setAuthError("");
    if (emailError || passwordError) return;
    setLoading(true);

    try {
      const user = await signIn(email.trim(), password, remember);
      if (user.role !== "admin") {
        // Sign out immediately if not an admin to prevent unauthorized access to this route
        await signOut();
        setAuthError(
          `Access restricted. The account (${user.email}) is registered as a ${user.role}, not an administrator. Please log in through the student or tutor portal.`
        );
        setLoading(false);
        return;
      }
      router.push("/admin");
    } catch (err) {
      setAuthError(authErrorMessage(err));
      setLoading(false);
    }
  };

  const inputBorder = (error: string) =>
    submitted && error ? "border-red-400 focus:border-red-500" : "border-forest-200 focus:border-forest-500";

  return (
    <Reveal immediate>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-900 text-spark-400 shadow-md shadow-forest-950/20">
          <ShieldIcon className="h-6 w-6" />
        </span>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-800">
            Internal Portal
          </span>
          <p className="text-xs text-slate-500">Security-monitored area</p>
        </div>
      </div>

      <h2 className="text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">Admin Portal</h2>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">
        Sign in to manage Nuels users, course catalogs, platform permissions and roles.
      </p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-forest-900">
            Admin Email Address
          </label>
          <div className="relative">
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              placeholder="admin@nuelsmart.com"
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
            <label htmlFor="admin-password" className="text-sm font-medium text-forest-900">
              Admin Password
            </label>
          </div>
          <div className="relative">
            <input
              id="admin-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
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
          Stay signed in on this administrative console
        </label>

        {authError && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {authError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-950/20 transition hover:bg-forest-800 disabled:opacity-70"
        >
          {loading ? "Authenticating Admin…" : "Sign In to Admin Console"}
          {!loading && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </form>

      <div className="my-8 flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-forest-100" />
        Other Portals
        <span className="h-px flex-1 bg-forest-100" />
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Link
          href="/tutor/login"
          className="flex-1 rounded-full border border-forest-200 px-4 py-2.5 text-center text-xs font-semibold text-forest-800 transition hover:bg-forest-50"
        >
          Tutor &amp; Mentor Portal →
        </Link>
        <Link
          href="/login"
          className="flex-1 rounded-full border border-forest-200 px-4 py-2.5 text-center text-xs font-semibold text-forest-800 transition hover:bg-forest-50"
        >
          Student Login →
        </Link>
      </div>
    </Reveal>
  );
}
