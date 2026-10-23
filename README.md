# Nuel Smart (nuelsmart.com)

Mentor-led course platform: public course pages, student registration, cart and UPI/bank
payments with screenshot approval, a course view for enrolled students, and dashboards for
admins, tutors and company staff.

- **Site:** Next.js 15, exported as static files (`output: "export"`) and served by Firebase Hosting.
- **Data and logins:** Firebase Auth and Firestore. All access control lives in `firestore.rules`.
- **Optional:** Cloud Functions in `functions/` (WhatsApp welcome message, Razorpay online payments).

## Accounts and where they land

| Role | Login page | Dashboard |
|---|---|---|
| Student | `/login` | `/dashboard`, and `/learn?course=…` for each enrolled course |
| Tutor / mentor | `/tutor/login` | `/mentor` |
| Employee (HR, Cashier, …) | `/login` | `/staff`, with sections set by the permissions an admin grants |
| Admin | `/admin/login` | `/admin` |

Admins create employee and other logins from the admin panel. Bootstrap admin emails are listed
in both `src/lib/auth.ts` and `firestore.rules`, so keep the two lists the same.

## Working on it

```bash
npm install
npm run dev          # http://localhost:3000, against the live Firebase project
npm run check        # lint + type-check + production build
npm run test:rules   # app flows + security rules against local emulators (needs Java 17+)
```

`npm run test:rules` drives the real `src/lib` code (register, cart, orders, approvals, course
progress, course management, employees) against the Auth and Firestore emulators using
`firestore.rules`. It also checks what each kind of user must **not** be able to do. Run it after
any change to the rules or to `src/lib`. CI (`.github/workflows/ci.yml`) runs everything on each
push to `main` and on pull requests.

## Releasing

1. `npm run check` and `npm run test:rules` both pass.
2. Deploy rules first. The site expects them, and older rules block newer features:
   `npx firebase-tools deploy --only firestore:rules`
3. `npx firebase-tools deploy --only hosting` (this uploads the `out/` folder from step 1's build).
4. Only if `functions/` changed: `npx firebase-tools deploy --only functions` (Blaze plan, see below).

When you change public page text, update `CONTENT_UPDATED` in `src/app/sitemap.ts` so Google
re-crawls the pages.

## Setup guides

- [PAYMENTS-SETUP.md](PAYMENTS-SETUP.md): UPI/bank payment details, screenshot approval, optional Razorpay.
- [WHATSAPP-SETUP.md](WHATSAPP-SETUP.md): optional automatic WhatsApp welcome message.

## Where things live

| Path | What |
|---|---|
| `src/data/site.ts`, `courseDetails.ts` | Built-in courses, mentors and page copy |
| `src/lib/catalog.ts` | Live course catalog: built-in courses plus admin edits from Firestore `catalog/` |
| `src/lib/orders.ts` | Cart, orders, payment proof and approval |
| `src/lib/learning.ts` | Course progress, assignments, attendance, videos |
| `src/lib/staff.ts` | Employee designations, permissions, account creation |
| `src/components/dashboard/` | Admin, staff, tutor and student dashboards |
| `firestore.rules` | Who can read and write what |
| `tests/` | Emulator test suites |
