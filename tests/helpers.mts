// Shared setup for the emulator tests. They drive the site's own src/lib code against the
// local Auth and Firestore emulators with the real firestore.rules. Run with `npm run test:rules`.
import { createRequire } from "node:module";

process.env.NEXT_PUBLIC_USE_EMULATORS = "1";
// The live catalog only subscribes in a browser; stand in a minimal window for it.
(globalThis as { window?: unknown }).window ??= {};

export const PROJECT = "nuelsmart-fb72e";
const AUTH = "http://127.0.0.1:9099";
const FIRESTORE = `http://127.0.0.1:${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT ?? 8085}`;

// The site's .ts modules load Firebase as CommonJS; load it the same way so there's one instance.
const require = createRequire(new URL("../src/lib/firebase.ts", import.meta.url));
export const fbAuth = require("firebase/auth") as typeof import("firebase/auth");
export const fbStore = require("firebase/firestore") as typeof import("firebase/firestore");

/** Wipes all emulator users and documents so each test file starts clean. */
export async function resetEmulators() {
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
}

/** Marks an emulator account's email as verified (bootstrap admins need this). */
export async function verifyEmail(uid: string) {
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: "POST",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
}

let failures = 0;

export async function check(name: string, job: () => Promise<unknown>, expect: "allowed" | "denied" = "allowed") {
  try {
    await job();
    if (expect === "denied") {
      failures++;
      console.log(`FAIL  ${name} (should have been blocked)`);
    } else console.log(`ok    ${name}`);
  } catch (err) {
    const code = (err as { code?: string }).code ?? String(err);
    if (expect === "denied" && /permission-denied|user-disabled/.test(code)) console.log(`ok    ${name} (blocked)`);
    else {
      failures++;
      console.log(`FAIL  ${name}: ${code}`);
    }
  }
}

export function assert(name: string, cond: boolean, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "ok   " : "FAIL "} ${name}${detail ? ` (${detail})` : ""}`);
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function finish() {
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}
