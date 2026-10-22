"use client";

import Link from "next/link";
import { useLenis } from "lenis/react";
import { useCallback, useEffect, useId, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import AvatarPicker from "../AvatarPicker";
import {
  BookIcon,
  CameraIcon,
  CartIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  GridIcon,
  HelpIcon,
  LockIcon,
  LogoutIcon,
  type IconProps,
} from "../icons";
import { Avatar } from "./ui";
import { authErrorMessage, changePassword, greetingName, homeFor, roleLabel, updateProfilePhoto, type AppUser } from "@/lib/auth";
import { passwordRules, strengthLabels, strengthStyles } from "@/lib/password";

type MenuLink = { label: string; href: string; icon: ComponentType<IconProps>; badge?: number };

/**
 * The profile chip in the dashboard top bar. Opens a menu with the learner's details,
 * photo and password changes, shortcuts and log out.
 */
export default function ProfileMenu({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"photo" | "password" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const closeDialog = useCallback(() => setDialog(null), []);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const show = (d: "photo" | "password") => {
    setOpen(false);
    setDialog(d);
  };

  const home = homeFor[user.role];
  const links: MenuLink[] =
    user.role === "student"
      ? [
          { label: "My courses", href: `${home}#my-courses`, icon: BookIcon, badge: user.enrolledCourses.length || undefined },
          { label: "My cart", href: "/cart", icon: CartIcon, badge: user.cart.length || undefined },
          { label: "Browse courses", href: "/courses", icon: GridIcon },
          { label: "Help & support", href: "/contact", icon: HelpIcon },
        ]
      : [
          { label: "Dashboard", href: home, icon: GridIcon },
          { label: "Help & support", href: "/contact", icon: HelpIcon },
        ];

  const item = "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-forest-50 hover:text-forest-800";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Open profile menu"
        className="flex items-center gap-3 rounded-full bg-forest-50 py-1 pl-1 pr-2 transition hover:bg-forest-100 sm:pr-4"
      >
        <Avatar name={user.name} photo={user.photo} className="h-11 w-11 text-base ring-2 ring-white sm:h-12 sm:w-12" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-base font-semibold text-forest-950">{greetingName(user)}</span>
          <span className="block text-xs text-slate-500">
            {roleLabel[user.role]}
            {user.memberId && <span className="ml-1.5 font-mono font-semibold text-forest-700">· {user.memberId}</span>}
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 text-forest-700 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-forest-100 bg-white p-2 shadow-2xl shadow-forest-900/15"
        >
          <div className="flex flex-col items-center rounded-2xl bg-forest-50/70 px-4 pb-4 pt-5 text-center">
            <button
              type="button"
              onClick={() => show("photo")}
              aria-label="Change profile photo"
              className="group relative rounded-full"
            >
              <Avatar name={user.name} photo={user.photo} className="h-24 w-24 text-2xl ring-4 ring-white" />
              <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-spark-500 text-forest-900 ring-2 ring-white transition group-hover:bg-spark-400">
                <CameraIcon className="h-4 w-4" />
              </span>
            </button>
            <p className="mt-3 font-semibold text-forest-950">{user.name}</p>
            <p className="max-w-full truncate text-xs text-slate-500">{user.email}</p>
            <p className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-forest-700">
              {roleLabel[user.role]}
              {user.memberId && <span className="ml-1.5 font-mono font-semibold">· {user.memberId}</span>}
            </p>
          </div>

          <div className="mt-2 space-y-0.5">
            <button type="button" onClick={() => show("photo")} className={item}>
              <CameraIcon className="h-[18px] w-[18px] text-forest-600" /> Change profile photo
            </button>
            <button type="button" onClick={() => show("password")} className={item}>
              <LockIcon className="h-[18px] w-[18px] text-forest-600" /> Change password
            </button>
          </div>
          <div className="my-2 border-t border-forest-100" />
          <div className="space-y-0.5">
            {links.map(({ label, href, icon: Icon, badge }) => (
              <Link key={label} href={href} onClick={() => setOpen(false)} className={item}>
                <Icon className="h-[18px] w-[18px] text-forest-600" />
                {label}
                {badge && (
                  <span className="ml-auto rounded-full bg-forest-700 px-2 py-0.5 text-[11px] font-bold text-spark-400">{badge}</span>
                )}
              </Link>
            ))}
          </div>
          <div className="my-2 border-t border-forest-100" />
          <button type="button" onClick={onLogout} className={`${item} text-red-600 hover:bg-red-50 hover:text-red-700`}>
            <LogoutIcon className="h-[18px] w-[18px]" /> Log out
          </button>
        </div>
      )}

      {dialog === "photo" && <PhotoDialog user={user} onClose={closeDialog} />}
      {dialog === "password" && <PasswordDialog onClose={closeDialog} />}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [lenis, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-forest-950/60 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        data-lenis-prevent
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl shadow-forest-950/30 sm:max-w-md sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={id} className="text-xl font-bold tracking-tight text-forest-950">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-forest-50 hover:text-forest-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function PhotoDialog({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (photo: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfilePhoto(user.uid, photo);
      setMessage({ ok: true, text: photo ? "Profile photo updated." : "Profile photo removed." });
    } catch (err) {
      console.error("Could not save profile photo", err);
      setMessage({ ok: false, text: "Couldn't save your photo. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Profile photo" onClose={onClose}>
      <p className="mt-1 text-sm text-slate-600">Upload a clear photo of your face. It&apos;s shown to your mentors.</p>
      <div className={`mt-5 ${saving ? "pointer-events-none opacity-60" : ""}`}>
        <AvatarPicker value={user.photo ?? ""} onChange={save} label={null} previewClassName="h-24 w-24" />
      </div>
      {saving && <p className="mt-4 text-sm text-slate-500">Saving…</p>}
      {message && (
        <p role="status" className={`mt-4 flex items-center gap-1.5 text-sm font-medium ${message.ok ? "text-forest-700" : "text-red-600"}`}>
          {message.ok && <CheckIcon className="h-4 w-4" />}
          {message.text}
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-full border border-forest-200 py-3 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
      >
        Done
      </button>
    </Dialog>
  );
}

const inputClass =
  "w-full rounded-2xl border border-forest-100 bg-white px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-forest-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50 hover:text-forest-700"
        >
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const id = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const strength = next ? passwordRules.filter((r) => r.test(next)).length : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!current) return setError("Please enter your current password.");
    if (!passwordRules.every((r) => r.test(next))) return setError("Your new password doesn't meet all the requirements.");
    if (next !== confirm) return setError("The new passwords don't match.");
    if (next === current) return setError("Choose a password different from your current one.");
    setSaving(true);
    setError("");
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(
        code === "auth/invalid-credential" || code === "auth/wrong-password" ? "Your current password is incorrect." : authErrorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Change password" onClose={onClose}>
      {done ? (
        <div className="py-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-spark-500 text-forest-900">
            <CheckIcon className="h-7 w-7" />
          </span>
          <p className="mt-4 font-semibold text-forest-950">Password changed</p>
          <p className="mt-1 text-sm text-slate-600">Use your new password the next time you log in.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-forest-600"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <PasswordInput id={`${id}-current`} label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
          <PasswordInput id={`${id}-new`} label="New password" value={next} onChange={setNext} autoComplete="new-password" />
          <PasswordInput id={`${id}-confirm`} label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

          <div className="rounded-2xl bg-forest-50/70 p-4">
            <div className="flex items-center gap-3">
              <div className="grid flex-1 grid-cols-4 gap-1.5">
                {passwordRules.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full ${i < strength ? strengthStyles[strength] : "bg-forest-100"}`} />
                ))}
              </div>
              <span className="w-12 text-right text-xs font-semibold text-forest-700">{strengthLabels[strength]}</span>
            </div>
            <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
              {passwordRules.map((r) => {
                const ok = r.test(next);
                return (
                  <li key={r.label} className={`flex items-center gap-2 ${ok ? "text-forest-700" : "text-slate-500"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? "bg-forest-600 text-white" : "border border-slate-300"}`}>
                      {ok && <CheckIcon className="h-3 w-3" />}
                    </span>
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-forest-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-70"
          >
            {saving ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </Dialog>
  );
}
