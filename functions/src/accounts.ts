import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";

/**
 * Admin sets a new password for a user who lost theirs (e.g. after a support ticket).
 * Only an active admin may call it. The password must pass the same rules as sign-up
 * (src/lib/password.ts). Every change is recorded on the user's profile.
 */
const BOOTSTRAP_ADMINS = ["admin@nuelsmart.com", "admin@nuels.com", "anirudhjyothula@gmail.com", "srikanth.nsws1@gmail.com"];

const passwordOk = (p: string) => p.length >= 8 && p.length <= 64 && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

export const setUserPassword = onCall({ region: "asia-south1" }, async (req) => {
  const caller = req.auth;
  if (!caller) throw new HttpsError("unauthenticated", "Please log in again.");
  const db = getFirestore();
  const me = (await db.doc(`users/${caller.uid}`).get()).data();
  const bootstrap = caller.token.email_verified === true && BOOTSTRAP_ADMINS.includes(String(caller.token.email ?? "").toLowerCase());
  const isAdmin = bootstrap || (me?.role === "admin" && (me?.status ?? "active") === "active");
  if (!isAdmin) throw new HttpsError("permission-denied", "Only admins can set passwords.");

  const { uid, password } = (req.data ?? {}) as { uid?: unknown; password?: unknown };
  if (typeof uid !== "string" || !/^[A-Za-z0-9]{10,128}$/.test(uid)) throw new HttpsError("invalid-argument", "Choose an account.");
  if (typeof password !== "string" || !passwordOk(password))
    throw new HttpsError("invalid-argument", "The password needs at least 8 characters, an uppercase letter, a number and a special character.");

  const target = db.doc(`users/${uid}`);
  if (!(await target.get()).exists) throw new HttpsError("not-found", "That account doesn't exist.");
  await getAuth().updateUser(uid, { password });
  await target.update({ passwordSetByAdmin: { at: FieldValue.serverTimestamp(), by: caller.uid, byName: me?.name ?? caller.token.email ?? "Admin" } });
  logger.info("Password set by admin", { uid, by: caller.uid });
  return { ok: true };
});
