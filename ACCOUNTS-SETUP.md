# Passwords, resumes, inbox and tickets: setup

Everything below runs on the free **Spark** plan, except **Set new password**, which stays hidden
until you switch it on (see the end).

## Who can do what

- **Duplicates:** registration refuses an email, mobile number or full name (ignoring case, spaces
  and dots) that another account already uses. Removing an account frees its name and number.
  The first time an admin opens the Admin Panel, existing accounts' names and numbers are recorded
  (oldest account first), so new sign-ups can't copy them.
- **Inbox:** students and tutors write to the *Admin office* (any admin can read and reply) or reply to
  an admin. Employees write to admins, the office and other employees. Employees with **Message
  students & tutors** can also write to learners. Employees with **Read the admin office inbox**
  see the office mailbox. Admins can write to anyone.
- **Tickets:** students raise them from Help & Support; tutors and employees from **Requests & Leave**
  (leave, can't attend a class, transfer, suggestion, report). Admins, and employees with **Handle
  & assign all tickets**, assign each one to an admin, employee or tutor. The assignee sees it under
  **Assigned to me**, posts updates and resolves it. The person who raised it can reply.
- **Jobs:** signed-in users upload a resume (PDF or Word, up to 700 KB) from the profile menu and
  apply from the Jobs page. Resumes are stored in Firestore (`resumeFiles/{uid}`), so no Storage
  bucket is needed. Admins and employees with **Job openings & applications** see applications and
  resumes under Job openings and set each one to New, Shortlisted, Hired or Not selected.

## Later: admin "Set new password" (needs Blaze)

Firebase only lets a server set someone else's password, so this uses the Cloud Function
`setUserPassword` (`functions/src/accounts.ts`), and Cloud Functions need the pay-as-you-go
**Blaze** plan. At this site's traffic it stays inside the free allowance.

1. Firebase console → **Upgrade** → **Blaze**, add a billing account and set a budget alert.
2. `npx firebase-tools deploy --only functions:setUserPassword`
3. Rebuild the site with `NEXT_PUBLIC_ADMIN_SET_PASSWORD=1 npm run build` and deploy hosting.

The **Set new password** button then appears on the Tickets page and under Users → Actions.
Only admins can use it; each change is recorded on the user's profile (`passwordSetByAdmin`).
Until then, admins use **Send password reset email**.
