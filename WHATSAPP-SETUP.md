# WhatsApp welcome message: automatic setup

When someone registers, gives a mobile number and **ticks "Send me a welcome message on WhatsApp"**,
the Cloud Function `sendWhatsAppWelcome` (`functions/src/index.ts`) automatically sends them the
Nuel Smart welcome message from **+91 81218 46844**. No extra tap is needed after registering.
The result is saved on their profile as `whatsappWelcome` (`sent`, or `failed` with the reason).

Passwords are never sent: Firebase can't read them back, and sending them over chat is unsafe.

## Why this isn't free

WhatsApp only lets a business message people **automatically** through Meta's official
**WhatsApp Business Platform (Cloud API)**. The normal WhatsApp / WhatsApp Business apps can't do it.
Unofficial "WhatsApp Web automation" tools break WhatsApp's terms and get numbers banned, so don't
use them on 8121846844.

| Cost | What it's for | Roughly |
|---|---|---|
| Firebase **Blaze** plan | runs the sending function | free allowance covers this site's volume; card required |
| **Meta per-message fee** (Utility template, India) | each welcome message | a fraction of a rupee per message; check Meta's current India rate card |
| *(Optional)* a WhatsApp partner (AiSensy, Interakt, Wati, Gupshup…) | easier setup, inbox, support | monthly subscription on top of Meta's fee |

Meta updates rates at the start of each quarter: https://developers.facebook.com/docs/whatsapp/pricing

## 1. Upgrade Firebase to Blaze

https://console.firebase.google.com/project/nuelsmart-fb72e/usage/details. Add a budget alert
(e.g. ₹200) while you're there.

## 2. Connect 8121846844 to the WhatsApp Business Platform

Go to business.facebook.com → **WhatsApp Manager → Add phone number** → +91 81218 46844.

- **If the number is in the WhatsApp Business app:** Meta's *coexistence* option can let you keep using
  the app on the same number while the API sends messages. Availability in India and eligibility (account
  age, quality) are decided by Meta; if it's offered during sign-up, choose it.
- **Otherwise:** Meta moves the number to the API, and it can no longer be used in the WhatsApp app.
  Many businesses use a second number for this instead. If you do, tell the developer so the sender
  number can be switched.

Fill in the business profile: name *Nuel Smart*, website *https://nuelsmart.com*, email
*info@nuelsmart.com*, category *Education*. Meta may ask you to verify the business.

## 3. Create the message template

**WhatsApp Manager → Message templates → Create template**
- Name: **`nuelsmart_welcome`** (exactly)
- Category: **Utility** · Language: **English**
- Body (`{{1}}` name, `{{2}}` Student/Tutor ID, `{{3}}` login email are filled in automatically):

```
🎉 Congratulations {{1}}! Welcome to Nuel Smart.

Your account has been created successfully.
• Your ID: {{2}}
• Login email: {{3}}
• Student login: https://nuelsmart.com/login
• Tutor login: https://nuelsmart.com/tutor/login

Explore mentor-led courses, join live sessions and get feedback on your projects.

🌐 Website: https://nuelsmart.com
📞 Call: +91 81218 46844 / +91 81218 46845
✉️ Email: info@nuelsmart.com

Team Nuel Smart
```

Wait for the status to show **Approved** (minutes to a day).

## 4. Get the two API values

- **Phone number ID**: WhatsApp Manager → API Setup, next to +91 81218 46844.
- **Permanent access token**: Business Settings → System users → add a system user → give it the
  WhatsApp account with `whatsapp_business_messaging` permission → **Generate token**.

## 5. Deploy

In PowerShell, from `C:\Users\HP\Documents\nuels-main`:

```powershell
npx.cmd firebase-tools functions:secrets:set WHATSAPP_TOKEN
npm.cmd run build
npx.cmd firebase-tools deploy --only hosting,functions,firestore:rules
```

Paste the token when asked. On the first deploy, paste the **Phone number ID** when asked for
`WHATSAPP_PHONE_NUMBER_ID`. (If your template language is "English (US)", also answer `en_US` for
`WHATSAPP_TEMPLATE_LANGUAGE`; otherwise keep `en`.)

## 6. Test

Register a test account with your own mobile number and tick the WhatsApp box. Within a few seconds:
- the message arrives on WhatsApp;
- Firestore `users/{uid}.whatsappWelcome.status` shows `sent`;
- if not, Firebase console → Functions → Logs shows Meta's exact error.

Common errors: template not approved yet, wrong template name or language, expired token, or a phone
number not yet fully connected in WhatsApp Manager.
