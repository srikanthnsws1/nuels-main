# Course payments: setup

Students click **Enroll Now**. The course goes into their cart (`/cart`), they check out, and the
course unlocks on their dashboard once the payment is confirmed. There are two ways to pay:

| Method | How the course unlocks | Needs |
|---|---|---|
| **Pay offline** (UPI / bank transfer) | The student places the order and messages us on WhatsApp with the order ID. An admin checks the money arrived, then clicks **Admin panel → Orders → Mark paid**. | Nothing extra. Works today once the new Firestore rules are deployed. |
| **Pay online** (Razorpay) | Automatically: the `verifyRazorpayPayment` Cloud Function checks Razorpay's signature and unlocks the courses. | Razorpay account, Firebase Blaze plan, the steps below. |

Students can never unlock a course themselves. `firestore.rules` stop them writing `enrolledCourses`.

## 1. Deploy the Firestore rules (needed for both methods)

```
npx firebase-tools deploy --only firestore:rules
```

## 2. Turn on Razorpay (optional)

1. Create a Razorpay account and finish KYC at https://dashboard.razorpay.com. Under
   **Settings → Payment capture**, keep **automatic capture** on.
2. **Account & Settings → API Keys → Generate key**. Start with **Test mode** keys (`rzp_test_…`).
3. Store the secret for the Cloud Functions:
   ```
   npx firebase-tools functions:secrets:set RAZORPAY_KEY_SECRET
   ```
4. Deploy the functions. On the first deploy you'll be asked for `RAZORPAY_KEY_ID`; enter the key ID.
   ```
   npx firebase-tools deploy --only functions
   ```
5. Add the same key ID to the website build, in `.env.local` at the project root:
   ```
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   ```
   Then rebuild and redeploy hosting (`npm run build`, then `npx firebase-tools deploy --only hosting`).
   The **Pay online** option only appears when this is set.
6. Test with Razorpay's test cards or UPI (`success@razorpay`). When you're happy, switch steps 3–5 to the
   live keys (`rzp_live_…`).

Notes:
- Course prices are charged from the `PRICES` list in `functions/src/payments.ts`. **When you change a
  price in `src/data/site.ts`, change it there too**, then redeploy the functions.
- If a student pays online but closes the browser before the confirmation finishes, the order stays
  **pending**. Check the payment in the Razorpay dashboard, then use **Mark paid** in the admin panel.
- Once `RAZORPAY_KEY_SECRET` is defined, every functions deploy (including the WhatsApp one) expects
  it to be set.
