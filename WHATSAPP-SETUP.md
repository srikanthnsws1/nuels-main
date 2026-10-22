# WhatsApp welcome messages: setup

When someone registers with a mobile number **and ticks the WhatsApp consent box**, the Cloud Function
`sendWhatsAppWelcome` (`functions/src/index.ts`) sends them a welcome message through Meta's WhatsApp
Cloud API. Students and tutors get different messages. The result is saved on their profile as
`whatsappWelcome` (`sent` or `failed` with the reason).

Passwords are never sent. Firebase stores them one-way, so they can't be read back, and sending them
over chat would be unsafe. The message gives the member ID, login email and login link instead.

## 1. Requirements

- Firebase project on the **Blaze (pay-as-you-go)** plan. Cloud Functions need it; normal usage
  stays within the free allowance.
- A **Meta Business account** (business.facebook.com) and a **WhatsApp Business phone number** that
  isn't already used in the normal WhatsApp app.
- Meta charges per business-started conversation. Check current India rates in WhatsApp Manager.

## 2. Create the two message templates

In **WhatsApp Manager → Message templates → Create template**. Use **exactly** these names, because
the code refers to them. Language: **English**. Category: **Utility** (account confirmation).
Each `{{1}}`, `{{2}}` and `{{3}}` is filled in automatically: name, member ID, login email.

### `nuelsmart_welcome_student`

```
🎉 Congratulations {{1}}! Welcome to Nuel Smart.

Your student account is ready:
• Student ID: {{2}}
• Login email: {{3}}
• Log in: https://nuelsmart.com/login

Explore mentor-led courses, join live sessions and get feedback on your projects.

Need help? Call +91 81218 46844 / +91 81218 46845 or email info@nuelsmart.com
Team Nuel Smart · https://nuelsmart.com
```

### `nuelsmart_welcome_tutor`

```
🎉 Congratulations {{1}}! Thank you for applying to teach with Nuel Smart.

Your instructor account is created:
• Tutor ID: {{2}}
• Login email: {{3}}
• Tutor portal: https://nuelsmart.com/tutor/login

Our team will review your application and activate your mentor dashboard once approved.

Questions? Call +91 81218 46844 / +91 81218 46845 or email info@nuelsmart.com
Team Nuel Smart · https://nuelsmart.com
```

Meta usually approves templates within minutes to a day. Messages fail until they're approved.

## 3. Get the API details

In **WhatsApp Manager → API Setup** (or developers.facebook.com → your app → WhatsApp):

1. Copy the **Phone number ID** of your business number.
2. Create a **permanent access token**: Business Settings → System users → add a system user with the
   `whatsapp_business_messaging` permission → Generate token. (The temporary 24-hour token on the API
   Setup page is only for testing.)

## 4. Deploy

From `C:\Users\HP\Documents\nuels-main` in PowerShell:

```powershell
npx.cmd firebase-tools functions:secrets:set WHATSAPP_TOKEN
npx.cmd firebase-tools deploy --only functions,firestore:rules
```

- The first command asks for the token. Paste it; it's stored in Google Secret Manager, not in the code.
- On the first functions deploy you'll be asked for `WHATSAPP_PHONE_NUMBER_ID`. Paste the Phone number ID.
  (`WHATSAPP_TEMPLATE_LANGUAGE` defaults to `en`. Change it if your templates use `en_US`.)

## 5. Test

Register a test account with your own number and tick the WhatsApp box. Then check:

- Your phone for the message.
- Firestore → `users/{uid}` → `whatsappWelcome.status`.
- Firebase console → Functions → Logs, for any error from Meta.

Common errors: template name or language mismatch, template not yet approved, an expired token, or a
number that hasn't been verified as a test recipient while the app is still in development mode.
