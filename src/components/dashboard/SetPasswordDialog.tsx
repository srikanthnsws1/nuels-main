"use client";

import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "../icons";
import Dialog from "./Dialog";
import { functions } from "@/lib/firebase";
import { passwordRules } from "@/lib/password";

/**
 * "Set new password" needs the setUserPassword Cloud Function, which needs the Blaze plan.
 * Build with NEXT_PUBLIC_ADMIN_SET_PASSWORD=1 once it's deployed (see ACCOUNTS-SETUP.md).
 */
export const PASSWORD_SERVICE_ON = process.env.NEXT_PUBLIC_ADMIN_SET_PASSWORD === "1";

const setUserPassword = httpsCallable<{ uid: string; password: string }, { ok: boolean }>(functions, "setUserPassword");

/** A random password that passes every rule, without look-alike characters (0/O, 1/l/I). */
export function generatePassword(length = 10) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "@#$%&*!?"];
  const all = sets.join("");
  const pick = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const chars = [...sets.map(pick), ...Array.from({ length: length - sets.length }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const errorText = (err: unknown) => {
  const e = err as { code?: string; message?: string };
  if (e.code === "functions/permission-denied") return "Only admins can set passwords.";
  if (e.code === "functions/invalid-argument") return e.message ?? "That password isn't allowed.";
  if (e.code === "functions/not-found" && /account/.test(e.message ?? "")) return e.message!;
  if (e.code === "functions/not-found" || e.code === "functions/internal" || e.code === "functions/unavailable")
    return "The password service isn't switched on yet. The Cloud Function needs to be deployed (Blaze plan).";
  return "Couldn't set the password. Check your connection and try again.";
};

/** Admin: sets a new password for an account, typed or generated, and shows it to pass on. */
export default function SetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: { uid: string; name: string; email: string; memberId?: string };
  onClose: () => void;
  /** Called after the password is set (e.g. to note it on a ticket). */
  onDone?: () => Promise<unknown> | void;
}) {
  const [mode, setMode] = useState<"generate" | "type">("generate");
  const [password, setPassword] = useState(() => generatePassword());
  const [show, setShow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const ok = passwordRules.every((r) => r.test(password));

  const save = async () => {
    if (!ok) return setError("The password doesn't meet every rule below.");
    if (!window.confirm(`Set this new password for ${user.name}? Their old password stops working straight away.`)) return;
    setSaving(true);
    setError("");
    try {
      await setUserPassword({ uid: user.uid, password });
      await onDone?.();
      setDone(true);
    } catch (err) {
      console.error("Could not set password", err);
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(password).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shown = (
    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-forest-100 bg-forest-50/60 px-4 py-3">
      <span className="min-w-0 flex-1 break-all font-mono text-lg font-bold tracking-wide text-forest-950">{show ? password : "•".repeat(password.length)}</span>
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="rounded-full p-2 text-slate-500 hover:bg-white">
        {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
      <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-600">
        {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );

  if (done)
    return (
      <Dialog title="Password set" onClose={onClose}>
        <p className="mt-2 text-sm text-slate-600">
          {user.name} can now log in with {user.memberId ? <strong>{user.memberId}</strong> : "their email"} and this password:
        </p>
        {shown}
        <p className="mt-3 text-xs text-slate-500">Share it only after confirming it&apos;s really them (for example by phone). Ask them to change it from their profile menu after logging in.</p>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-full bg-forest-700 py-3 text-sm font-semibold text-white hover:bg-forest-600">
          Done
        </button>
      </Dialog>
    );

  return (
    <Dialog title="Set new password" onClose={onClose}>
      <p className="mt-1 text-sm text-slate-600">
        For <strong className="text-forest-950">{user.name}</strong> {user.memberId && <span className="font-mono text-xs text-forest-700">{user.memberId}</span>} · {user.email}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-forest-50 p-1 text-sm font-semibold" role="radiogroup" aria-label="How to choose the password">
        {(["generate", "type"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => {
              setMode(m);
              setPassword(m === "generate" ? generatePassword() : "");
              setShow(true);
              setError("");
            }}
            className={`rounded-full py-2 transition ${mode === m ? "bg-forest-700 text-white" : "text-forest-800 hover:bg-white"}`}
          >
            {m === "generate" ? "Generate password" : "Type my own"}
          </button>
        ))}
      </div>
      {mode === "generate" ? (
        <>
          {shown}
          <button type="button" onClick={() => setPassword(generatePassword())} className="mt-2 text-sm font-semibold text-forest-700 hover:text-forest-500">
            Generate another
          </button>
        </>
      ) : (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-forest-900">New password</span>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={64}
              className="w-full rounded-2xl border border-forest-100 bg-white px-4 py-3 pr-12 font-mono text-sm text-slate-700 outline-none focus:border-forest-300"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50"
            >
              {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </label>
      )}
      <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
        {passwordRules.map((r) => {
          const pass = r.test(password);
          return (
            <li key={r.label} className={`flex items-center gap-2 ${pass ? "text-forest-700" : "text-slate-500"}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${pass ? "bg-forest-600 text-white" : "border border-slate-300"}`}>{pass && <CheckIcon className="h-3 w-3" />}</span>
              {r.label}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving || !ok}
        className="mt-6 w-full rounded-full bg-forest-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 hover:bg-forest-600 disabled:opacity-50"
      >
        {saving ? "Setting password…" : "Set password"}
      </button>
    </Dialog>
  );
}
