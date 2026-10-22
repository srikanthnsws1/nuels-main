# WhatsApp welcome message: setup (free)

After registering, everyone sees a green **"Get your welcome message on WhatsApp"** button. It opens
WhatsApp with a short hello addressed to Nuel Smart (their name, Student/Tutor ID and email). When they
send it, the free **WhatsApp Business app** automatically replies with the congratulations message below.
This costs nothing and needs no server.

The number the button opens is `contactInfo.whatsapp` in `src/data/site.ts` (currently `918121846844`,
i.e. +91 81218 46844). Change it there if your WhatsApp Business account uses another number, then
rebuild and deploy.

## 1. Install WhatsApp Business

Install **WhatsApp Business** (free, Android or iPhone) on the phone with **+91 81218 46844** and register
that number. Fill in the business profile: name *Nuel Smart*, website *https://nuelsmart.com*,
email *info@nuelsmart.com*, and category *Education*.

## 2. Turn on the greeting message

WhatsApp Business → **⋮ / Settings → Business tools → Greeting message** → turn on → **Send to:
Everyone** → paste this message → Save:

```
🎉 Congratulations and welcome to Nuel Smart!

Thank you for registering with us. Your account is ready. Log in anytime to explore mentor-led courses, join live sessions and get feedback on your projects.

🌐 Website: https://nuelsmart.com
🔐 Student login: https://nuelsmart.com/login
👩‍🏫 Tutor login: https://nuelsmart.com/tutor/login
📞 Call us: +91 81218 46844 / +91 81218 46845
✉️ Email: info@nuelsmart.com

We're happy to have you with us!
Team Nuel Smart
```

## 3. Test

Register a test account on https://nuelsmart.com/register, tap the green WhatsApp button and send the
message. The greeting should arrive within a few seconds.

## Good to know

- WhatsApp sends the greeting when someone messages you **for the first time**, or after **14 days** with no
  messages between you. If you test with a number that already chatted with the business, it won't appear.
- The greeting is the same for everyone. Their hello message tells your team who they are (name, ID,
  email), so you can follow up personally.
- People have to tap the button and press send; WhatsApp doesn't allow businesses to message someone
  first without the paid API.

## Optional later: fully automatic messages (paid)

`functions/src/index.ts` contains a Cloud Function that sends personalised messages automatically through
Meta's WhatsApp Cloud API, without the person tapping anything. It needs the Firebase **Blaze** plan, a Meta
WhatsApp Business API account with approved templates, and per-message fees from Meta. It isn't deployed
and does nothing until then. Ask for it to be re-enabled if you upgrade.
