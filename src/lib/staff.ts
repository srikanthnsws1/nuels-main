"use client";

import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { withMemberId } from "./auth";
import { auth, db, firebaseConfig } from "./firebase";

/**
 * Company employees: accounts with role "employee", a designation and a list of permissions
 * that decide which parts of the staff dashboard they see. firestore.rules check the same
 * permissions, so hiding a section isn't the only protection.
 */
export const designations = [
  "HR",
  "CA",
  "Cashier",
  "Accountant",
  "Coordinator",
  "Office Staff",
  "Front Office",
  "Sales",
  "Manager",
  "Assistant Manager",
  "Other",
] as const;

export const permissionList = [
  { id: "payments.view", label: "View payments & orders" },
  { id: "payments.approve", label: "Accept or reject payments" },
  { id: "students.view", label: "View students" },
  { id: "learners.manage", label: "Record attendance, interviews & grades" },
  { id: "courses.manage", label: "Add & edit courses" },
  { id: "videos.manage", label: "Manage course videos" },
  { id: "staff.view", label: "View employee directory" },
] as const;

export type Permission = (typeof permissionList)[number]["id"];

/** Suggested access for each designation; admins can change it per employee. */
export const defaultPermissions: Record<(typeof designations)[number], Permission[]> = {
  HR: ["staff.view", "students.view"],
  CA: ["payments.view"],
  Cashier: ["payments.view", "payments.approve"],
  Accountant: ["payments.view"],
  Coordinator: ["students.view", "learners.manage", "videos.manage"],
  "Office Staff": ["students.view"],
  "Front Office": ["students.view", "payments.view"],
  Sales: ["students.view", "payments.view"],
  Manager: ["payments.view", "payments.approve", "students.view", "learners.manage", "courses.manage", "videos.manage", "staff.view"],
  "Assistant Manager": ["payments.view", "students.view", "learners.manage", "courses.manage", "staff.view"],
  Other: [],
};

export const can = (user: { role: string; permissions: string[] }, p: Permission) => user.role === "admin" || user.permissions.includes(p);

export type EmployeeFields = {
  name: string;
  phone: string;
  designation: string;
  employeeNumber: string;
  joinDate?: string;
  permissions: string[];
  photo?: string;
};

/**
 * A second Firebase app just for creating accounts: creating a user signs that user in, and
 * doing it on this app keeps the admin signed in on the main one.
 */
function creatorAuth() {
  const app = getApps().find((a) => a.name === "staff-creator") ?? initializeApp(firebaseConfig, "staff-creator");
  const creator = getAuth(app);
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "1" && !creator.emulatorConfig) {
    connectAuthEmulator(creator, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return creator;
}

/** Admin: creates the employee's login and profile. Returns the new account's uid and member ID. */
export async function createEmployee(fields: EmployeeFields & { email: string; password: string }) {
  const creator = creatorAuth();
  const { user } = await createUserWithEmailAndPassword(creator, fields.email.trim(), fields.password);
  await signOut(creator);

  const profile = {
    name: fields.name.trim(),
    email: user.email ?? fields.email.trim(),
    phone: fields.phone.trim(),
    role: "employee",
    designation: fields.designation,
    employeeNumber: fields.employeeNumber.trim(),
    ...(fields.joinDate ? { joinDate: fields.joinDate } : {}),
    permissions: fields.permissions,
    ...(fields.photo ? { photo: fields.photo } : {}),
    status: "active",
    createdAt: serverTimestamp(),
  };
  const memberId = await withMemberId(user.uid, "E", profile);
  return { uid: user.uid, memberId };
}

/** Admin: updates an employee's details, access or status. */
export function updateEmployee(uid: string, fields: Partial<EmployeeFields> & { status?: "active" | "inactive" }) {
  return updateDoc(doc(db, "users", uid), { ...fields, updatedAt: serverTimestamp() });
}

/** Emails the employee a link to set a new password. */
export function sendEmployeePasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}
