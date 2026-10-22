"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useId, useState, type FormEvent } from "react";
import AvatarPicker from "../AvatarPicker";
import { CheckIcon, EyeIcon, EyeOffIcon, PlusIcon, SearchIcon, UsersIcon } from "../icons";
import Dialog from "./Dialog";
import { Avatar, Card, CardTitle, EmptyState } from "./ui";
import { authErrorMessage } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { passwordRules } from "@/lib/password";
import { createEmployee, defaultPermissions, designations, permissionList, sendEmployeePasswordReset, updateEmployee } from "@/lib/staff";

export type Employee = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  employeeNumber?: string;
  memberId?: string;
  joinDate?: string;
  permissions?: string[];
  photo?: string;
  status?: "active" | "inactive";
};

/** All employee accounts, live. */
export function useEmployees(): { employees: Employee[] | null; error: string } {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [error, setError] = useState("");
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "users"), where("role", "==", "employee")),
        (snap) => setEmployees(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as Employee).sort((a, b) => a.name.localeCompare(b.name))),
        () => setError("Couldn't load employees. Make sure the Firestore rules are deployed."),
      ),
    [],
  );
  return { employees, error };
}

const input =
  "w-full rounded-2xl border border-forest-100 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300 disabled:bg-slate-50 disabled:text-slate-500";
const label = "mb-1.5 block text-sm font-medium text-forest-900";

function EmployeeEditor({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const id = useId();
  const isNew = !employee;
  const [f, setF] = useState({
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    designation: employee?.designation ?? designations[0],
    employeeNumber: employee?.employeeNumber ?? "",
    joinDate: employee?.joinDate ?? "",
    photo: employee?.photo ?? "",
    permissions: employee?.permissions ?? [...defaultPermissions[designations[0]]],
    status: employee?.status ?? "active",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ memberId: string } | null>(null);
  const [resetSent, setResetSent] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const chooseDesignation = (d: string) =>
    setF((x) => ({ ...x, designation: d, permissions: [...(defaultPermissions[d as keyof typeof defaultPermissions] ?? [])] }));
  const togglePermission = (p: string) =>
    set("permissions", f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError("Enter the employee's full name.");
    if (!f.employeeNumber.trim()) return setError("Enter the employee number.");
    if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(f.phone.replace(/\s/g, ""))) return setError("Enter a valid 10-digit mobile number.");
    if (isNew) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError("Enter a valid email address.");
      if (!passwordRules.every((r) => r.test(f.password))) return setError("The password needs 8+ characters with an uppercase letter, a number and a special character.");
      if (f.password !== f.confirm) return setError("The passwords don't match.");
    }
    setSaving(true);
    setError("");
    const fields = {
      name: f.name.trim(),
      phone: f.phone.replace(/\s/g, ""),
      designation: f.designation,
      employeeNumber: f.employeeNumber.trim(),
      joinDate: f.joinDate,
      permissions: f.permissions,
      photo: f.photo,
    };
    try {
      if (isNew) {
        const { memberId } = await createEmployee({ ...fields, email: f.email, password: f.password });
        setDone({ memberId });
      } else {
        await updateEmployee(employee.uid, { ...fields, status: f.status as "active" | "inactive" });
        onClose();
      }
    } catch (err) {
      console.error("Could not save employee", err);
      const code = (err as { code?: string }).code ?? "";
      setError(code.startsWith("auth/") ? authErrorMessage(err) : "Couldn't save. Check your connection and Firestore rules.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setResetSent("");
    try {
      await sendEmployeePasswordReset(employee!.email);
      setResetSent(`Password reset link sent to ${employee!.email}.`);
    } catch (err) {
      setResetSent(authErrorMessage(err));
    }
  };

  if (done) {
    return (
      <Dialog title="Employee added" onClose={onClose}>
        <div className="mt-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-spark-500 text-forest-900">
            <CheckIcon className="h-7 w-7" />
          </span>
          <p className="mt-4 font-semibold text-forest-950">{f.name} can now log in</p>
          <dl className="mx-auto mt-4 max-w-xs space-y-1 rounded-2xl bg-forest-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Login page</dt>
              <dd className="font-semibold text-forest-950">nuelsmart.com/login</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="break-all font-semibold text-forest-950">{f.email.trim()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Staff ID</dt>
              <dd className="font-mono font-semibold text-forest-950">{done.memberId}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">Share the password you set with them privately. They can change it from their profile menu.</p>
          <button type="button" onClick={onClose} className="mt-6 rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white hover:bg-forest-600">
            Done
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title={isNew ? "Add an employee" : `Edit ${employee.name}`} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="mt-5 space-y-5">
        <AvatarPicker value={f.photo} onChange={(v) => set("photo", v)} label="Profile photo" previewClassName="h-20 w-20" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-name`} className={label}>
              Full name
            </label>
            <input id={`${id}-name`} value={f.name} onChange={(e) => set("name", e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-number`} className={label}>
              Employee number
            </label>
            <input id={`${id}-number`} value={f.employeeNumber} placeholder="e.g. NS-EMP-001" onChange={(e) => set("employeeNumber", e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-designation`} className={label}>
              Designation
            </label>
            <select id={`${id}-designation`} value={f.designation} onChange={(e) => chooseDesignation(e.target.value)} className={input}>
              {designations.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-join`} className={label}>
              Joining date <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input id={`${id}-join`} type="date" value={f.joinDate} onChange={(e) => set("joinDate", e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-email`} className={label}>
              Login email
            </label>
            <input id={`${id}-email`} type="email" value={f.email} disabled={!isNew} onChange={(e) => set("email", e.target.value)} className={input} />
            {!isNew && <p className="mt-1 text-xs text-slate-400">The login email can&apos;t be changed.</p>}
          </div>
          <div>
            <label htmlFor={`${id}-phone`} className={label}>
              Contact number
            </label>
            <input id={`${id}-phone`} type="tel" value={f.phone} placeholder="98765 43210" onChange={(e) => set("phone", e.target.value)} className={input} />
          </div>

          {isNew ? (
            <>
              <div>
                <label htmlFor={`${id}-password`} className={label}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id={`${id}-password`}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={f.password}
                    onChange={(e) => set("password", e.target.value)}
                    className={`${input} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50"
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">8+ characters, with an uppercase letter, a number and a special character.</p>
              </div>
              <div>
                <label htmlFor={`${id}-confirm`} className={label}>
                  Confirm password
                </label>
                <input
                  id={`${id}-confirm`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={f.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  className={input}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor={`${id}-status`} className={label}>
                  Account status
                </label>
                <select id={`${id}-status`} value={f.status} onChange={(e) => set("status", e.target.value as "active" | "inactive")} className={input}>
                  <option value="active">Active: can log in</option>
                  <option value="inactive">Inactive: login blocked</option>
                </select>
              </div>
              <div>
                <p className={label}>Password</p>
                <button type="button" onClick={reset} className="rounded-full border border-forest-200 px-4 py-2.5 text-sm font-semibold text-forest-700 hover:bg-forest-50">
                  Email a password reset link
                </button>
                {resetSent && <p className="mt-1 text-xs text-forest-700">{resetSent}</p>}
              </div>
            </>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-bold text-forest-950">Access permissions</legend>
          <p className="mt-0.5 text-xs text-slate-500">Pre-filled for the designation. Each permission adds a section to their staff dashboard.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {permissionList.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-forest-100 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-forest-50">
                <input type="checkbox" checked={f.permissions.includes(p.id)} onChange={() => togglePermission(p.id)} className="h-4 w-4 accent-forest-700" />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-forest-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Create login" : "Save changes"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Employee directory. With `canEdit`, admins can add employees and change their details and access. */
export function EmployeesCard({ canEdit = false }: { canEdit?: boolean }) {
  const { employees, error } = useEmployees();
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [q, setQ] = useState("");
  const [designation, setDesignation] = useState("all");

  const term = q.trim().toLowerCase();
  const visible = (employees ?? []).filter(
    (e) =>
      (designation === "all" || e.designation === designation) &&
      (!term || [e.name, e.email, e.employeeNumber, e.memberId, e.phone].some((v) => v?.toLowerCase().includes(term))),
  );

  return (
    <Card id="employees">
      <CardTitle
        title="Employees"
        action={
          canEdit && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-forest-700/20 transition hover:bg-forest-600"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Add employee
            </button>
          )
        }
      />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <select
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          aria-label="Filter by designation"
          className="rounded-full border border-forest-100 bg-white px-4 py-2 text-sm font-medium text-forest-900 outline-none focus:border-forest-300"
        >
          <option value="all">All designations</option>
          {designations.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <div className="flex flex-1 items-center gap-3 rounded-full border border-forest-100 bg-white px-4 py-2 focus-within:border-forest-300">
          <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, employee number or phone"
            aria-label="Search employees"
            className="w-full min-w-0 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {employees === null && !error ? (
        <p className="mt-6 text-sm text-slate-500">Loading employees…</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={UsersIcon} title={employees?.length ? "No employees match" : "No employees yet"}>
          {canEdit && !employees?.length && "Add an employee to give them a staff login."}
        </EmptyState>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((e) => (
            <li key={e.uid} className={`flex gap-3 rounded-2xl border border-forest-100 p-4 ${e.status === "inactive" ? "opacity-60" : ""}`}>
              <Avatar name={e.name} photo={e.photo} className="h-14 w-14 text-base" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-forest-950">{e.name}</p>
                  {e.status === "inactive" && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Inactive</span>}
                </div>
                <p className="text-sm font-medium text-forest-700">{e.designation}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {e.employeeNumber && <span className="font-mono">{e.employeeNumber}</span>}
                  {e.memberId && <span className="font-mono"> · {e.memberId}</span>}
                </p>
                <p className="truncate text-xs text-slate-500">{e.email}</p>
                {e.phone && <p className="text-xs text-slate-500">{e.phone}</p>}
                {canEdit && (
                  <button type="button" onClick={() => setEditing(e)} className="mt-2 text-xs font-semibold text-forest-700 hover:text-forest-500">
                    Edit details &amp; access →
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <EmployeeEditor employee={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
