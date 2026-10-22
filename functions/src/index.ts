import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

initializeApp();

/**
 * WhatsApp Cloud API (Meta) settings.
 * - WHATSAPP_TOKEN: permanent system-user access token (secret, never in the website code).
 * - WHATSAPP_PHONE_NUMBER_ID: the sending number's ID from WhatsApp Manager → API Setup.
 * Set them with:  npx firebase-tools functions:secrets:set WHATSAPP_TOKEN
 * and answer the WHATSAPP_PHONE_NUMBER_ID prompt on first deploy.
 */
const whatsappToken = defineSecret("WHATSAPP_TOKEN");
const phoneNumberId = defineString("WHATSAPP_PHONE_NUMBER_ID");
const templateLanguage = defineString("WHATSAPP_TEMPLATE_LANGUAGE", { default: "en" });

// Approved message templates (see WHATSAPP-SETUP.md for their exact text).
const TEMPLATES = {
  student: "nuelsmart_welcome_student",
  tutor: "nuelsmart_welcome_tutor",
} as const;

const GRAPH_API = "https://graph.facebook.com/v21.0";

/** "98765 43210" / "+91-9876543210" → "919876543210" (WhatsApp wants digits with country code). */
export function toWhatsAppNumber(phone: string, country = "India"): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits) && country === "India") return `91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/**
 * Sends the welcome WhatsApp message once a new profile is created, but only if the person
 * gave a mobile number and ticked the WhatsApp consent box. Separate templates for students
 * and tutor/instructor applicants. The outcome is recorded on the profile as `whatsappWelcome`.
 */
export const sendWhatsAppWelcome = onDocumentCreated(
  { document: "users/{uid}", region: "asia-south1", secrets: [whatsappToken], retry: false },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const user = snap.data();

    if (user.whatsappOptIn !== true) return logger.info("No WhatsApp consent; skipping", { uid: event.params.uid });
    const to = typeof user.phone === "string" ? toWhatsAppNumber(user.phone, user.country) : null;
    if (!to) return logger.warn("No valid mobile number; skipping", { uid: event.params.uid });

    const tutor = user.requestedRole === "mentor" || user.role === "mentor";
    const firstName = String(user.nickname || user.name || "there").split(" ")[0];
    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: tutor ? TEMPLATES.tutor : TEMPLATES.student,
        language: { code: templateLanguage.value() },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: firstName }, // {{1}} name
              { type: "text", text: user.memberId || "being generated" }, // {{2}} member ID
              { type: "text", text: user.email || "" }, // {{3}} login email
            ],
          },
        ],
      },
    };

    const res = await fetch(`${GRAPH_API}/${phoneNumberId.value()}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${whatsappToken.value()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };

    await snap.ref.update({
      whatsappWelcome: res.ok
        ? { status: "sent", messageId: result.messages?.[0]?.id ?? null, template: body.template.name, at: FieldValue.serverTimestamp() }
        : { status: "failed", error: result.error?.message ?? `HTTP ${res.status}`, template: body.template.name, at: FieldValue.serverTimestamp() },
    });

    if (res.ok) logger.info("WhatsApp welcome sent", { uid: event.params.uid, template: body.template.name });
    else logger.error("WhatsApp welcome failed", { uid: event.params.uid, status: res.status, error: result.error });
  },
);
