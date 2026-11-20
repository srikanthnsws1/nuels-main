"use client";

import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * One account per phone number, per full name and per email. Each is claimed in
 * `uniquePhones/{key}`, `uniqueNames/{key}` and `uniqueEmails/{key}` (holding the owner's uid)
 * when the account is created; registration checks them first. Firebase Auth only blocks the
 * exact same address, so the email key also folds Gmail's aliases together, and addresses on
 * misspelled domains ("gimli.com", "eamil.com") are refused outright.
 */
export const phoneKey = (phone?: string) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
};
/** "Srikanth  Seelam" and "srikanth seelam." are the same name. */
export const nameKey = (name?: string) => (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 100);

/**
 * Gmail ignores dots and anything after "+", and googlemail.com is the same inbox, so
 * "Ab.hi+1@GoogleMail.com" and "abhi@gmail.com" share one key.
 */
export const emailKey = (email?: string) => {
  const e = (email ?? "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return "";
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.split("+")[0].replace(/\./g, "");
  const key = `${local}@${domain}`;
  return /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}$/.test(key) ? key : "";
};

/** Misspellings of popular mail domains, mapped to the domain that was meant. */
const domainTypos: Record<string, string> = {};
for (const [right, wrong] of Object.entries({
  "gmail.com":
    "gimli gimil gmil gmal gmai gmali gamil gmial gnail gmaik gmaul gmaill gamail gemail gmeil gmsil gmqil gmaim gmall gail gmaio gmaol gmajl gmali gmail.co gmail.con gmail.cm gmail.om gmail.comm gmail.in gmail.co.in eamil emial email emal",
  "yahoo.com": "yaho yahooo yhoo yahho yaoo yahoo.co yahoo.con",
  "outlook.com": "outlok outllok otlook outlook.con",
  "hotmail.com": "hotmal hotmial hotmil homail hotmail.con",
  "rediffmail.com": "redifmail rediffmial rediffmal",
}))
  for (const w of wrong.split(" ")) domainTypos[w.includes(".") ? w : `${w}.com`] = right;

/** The domain someone probably meant when theirs looks mistyped; "" when it looks fine. */
export function emailTypo(email?: string) {
  const domain = (email ?? "").trim().toLowerCase().split("@")[1] ?? "";
  return domainTypos[domain] ?? "";
}

export type Claim = { col: "uniquePhones" | "uniqueNames" | "uniqueEmails"; key: string };
type Details = { name?: string; phone?: string; email?: string };
const fieldOf = { uniqueNames: "name", uniquePhones: "phone", uniqueEmails: "email" } as const;

export const claimsFor = (p: Details): Claim[] =>
  [
    { col: "uniqueNames" as const, key: nameKey(p.name) },
    { col: "uniquePhones" as const, key: phoneKey(p.phone) },
    { col: "uniqueEmails" as const, key: emailKey(p.email) },
  ].filter((c) => c.key);

/** Which of name / phone / email already belong to another account. */
export async function takenDetails(p: Details, exceptUid?: string) {
  const taken = { name: false, phone: false, email: false };
  await Promise.all(
    claimsFor(p).map(async (c) => {
      const snap = await getDoc(doc(db, c.col, c.key));
      if (snap.exists() && snap.data().uid !== exceptUid) taken[fieldOf[c.col]] = true;
    }),
  );
  return taken;
}

/** Throws a coded error a form can show: email mistyped, or name / phone / email already registered. */
export async function assertAvailable(p: Details) {
  const suggestion = emailTypo(p.email);
  if (suggestion) throw Object.assign(new Error("Email typo"), { code: "nuels/email-typo", suggestion });
  const taken = await takenDetails(p);
  if (taken.email) throw Object.assign(new Error("Email taken"), { code: "nuels/email-taken" });
  if (taken.phone) throw Object.assign(new Error("Phone taken"), { code: "nuels/phone-taken" });
  if (taken.name) throw Object.assign(new Error("Name taken"), { code: "nuels/name-taken" });
}

/** Frees a removed account's name, phone and email so someone else can register them. */
export async function releaseClaims(uid: string, p: Details) {
  await Promise.all(
    claimsFor(p).map(async (c) => {
      const ref = doc(db, c.col, c.key);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().uid === uid) await deleteDoc(ref);
    }),
  );
}

/** Claims the name, phone and email for an account brought back by an admin, where nobody else holds them. */
export async function claimIfFree(uid: string, p: Details) {
  await Promise.all(
    claimsFor(p).map(async (c) => {
      const ref = doc(db, c.col, c.key);
      if (!(await getDoc(ref)).exists()) await setDoc(ref, { uid, createdAt: serverTimestamp() });
    }),
  );
}

let synced = false;
/**
 * Admin, once per visit: claims the name, phone and email of accounts created before these
 * checks existed (oldest account first, removed accounts skipped), so new sign-ups can't copy them.
 */
export async function syncClaims(users: (Details & { uid: string; status?: string; createdAt?: { toMillis(): number } })[]) {
  if (synced) return;
  synced = true;
  const cols = ["uniqueNames", "uniquePhones", "uniqueEmails"] as const;
  const snaps = await Promise.all(cols.map((c) => getDocs(collection(db, c)).catch(() => null)));
  const have = Object.fromEntries(cols.map((c, i) => [c, new Set(snaps[i]?.docs.map((d) => d.id) ?? [])])) as Record<Claim["col"], Set<string>>;
  const active = users.filter((u) => u.status !== "removed").sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
  for (const u of active)
    for (const c of claimsFor(u)) {
      if (have[c.col].has(c.key)) continue;
      have[c.col].add(c.key);
      await setDoc(doc(db, c.col, c.key), { uid: u.uid, createdAt: serverTimestamp() }).catch((err) => console.warn("Could not claim", c, err));
    }
}
