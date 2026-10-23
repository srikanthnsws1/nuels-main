# Course payments: setup

## How it works

1. A student clicks **Enroll Now**, and the course goes into their cart (`/cart`).
2. At checkout they click **Proceed to payment**. They then see your **UPI ID, QR code and bank details**,
   plus a "Pay with a UPI app" button on phones.
3. After paying, they **upload a screenshot of the payment** (and optionally the UPI transaction ID / UTR).
4. In **Admin panel → Payments**, you see every screenshot. Check it against your bank or UPI app, then:
   - **Accept**: the course unlocks, and the student gets the full dashboard (My courses, live sessions,
     assignments, certificates).
   - **Reject**: you type a reason. The student sees it and can upload a new screenshot.

Until a payment is accepted, a student's live sessions, assignments and certificates show as locked.
Students can never unlock a course themselves, because `firestore.rules` stop them writing `enrolledCourses`.

## 1. Deploy the Firestore rules

```
npx firebase-tools deploy --only firestore:rules
```

## 2. Enter your payment details

Log in as admin, open **Admin panel → Payment Details**, fill in your UPI ID, bank account and (optionally)
upload your UPI QR code, then click **Save**. Students see whatever is saved there, so you can change
these at any time without redeploying.

Screenshots and the QR code are stored as compressed images inside Firestore, so no Cloud Storage or
Blaze plan is needed.

## Optional: online payments with Razorpay

The site also contains a Razorpay integration, which stays switched off unless you configure it. It needs a
Razorpay account (with KYC done) and the Firebase **Blaze** plan.

1. In the Razorpay dashboard, generate API keys (start with **Test mode**). Keep **automatic capture** on.
2. `npx firebase-tools functions:secrets:set RAZORPAY_KEY_SECRET`
3. `npx firebase-tools deploy --only functions`. Enter the key ID when it asks for `RAZORPAY_KEY_ID`.
4. Add `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_…` to `.env.local`, then rebuild and redeploy hosting.
   A "Pay online" option then appears next to UPI / bank transfer.

Razorpay charges the prices set in **Admin panel → Courses**. The list in `functions/src/payments.ts` is only
a fallback for built-in courses that were never edited there.
