// Enroll -> cart -> pay -> approve -> learn, plus what students must not be able to do.
import { assert, check, fbAuth, fbStore, finish, resetEmulators, verifyEmail, wait } from "./helpers.mts";

const { auth, db } = await import("../src/lib/firebase.ts");
const A = await import("../src/lib/auth.ts");
const C = await import("../src/lib/catalog.ts");
const O = await import("../src/lib/orders.ts");
const L = await import("../src/lib/learning.ts");
const S = await import("../src/lib/staff.ts");
const { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } = fbAuth;
const { doc, getDoc, getDocs, setDoc, updateDoc, arrayUnion, collection, query, where } = fbStore;

await resetEmulators();
void [C, S, wait, setDoc, updateDoc, arrayUnion, query, where];

const PW = "Test@1234";
const UIUX = "ui-ux-design-masterclass";
const PY = "python-for-data-analysis";
const as = (email: string) => signOut(auth).then(() => signInWithEmailAndPassword(auth, email, PW));
const profile = async (uid: string) => (await getDoc(doc(db, "users", uid))).data()!;
const order = async (id: string) => ({ id, ...(await getDoc(doc(db, "orders", id))).data()   // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

// 1. Student registers through the site's register()
const student = await A.register({ name: "Siri Test", email: "siri@test.com", phone: "9876543210", password: PW });
assert("student profile created as student", (await profile(student.uid)).role === "student");
assert("student got a member ID", /^S\d{4}$/.test(student.memberId ?? ""), student.memberId);

// 2. Enroll Now → cart
await check("add UI/UX to cart", () => O.addToCart(student.uid, UIUX));
await check("add Python to cart", () => O.addToCart(student.uid, PY));
assert("cart holds both courses", (await profile(student.uid)).cart?.length === 2);

// Things a student must not be able to do
await check("student enrolls themselves", () => updateDoc(doc(db, "users", student.uid), { enrolledCourses: arrayUnion(UIUX) }), "denied");
await check("student opens course before paying (progress)", () => L.setLessonDone(student.uid, UIUX, "m1-l1", true), "denied");
await check("student reads paid videos before paying", () => getDoc(doc(db, "courseContent", UIUX, "paid", "videos")), "denied");
await check(
  "student creates an already-paid order",
  () => setDoc(doc(collection(db, "orders")), { uid: student.uid, name: "x", email: "x", courses: [UIUX], amount: 1, method: "manual", status: "paid", createdAt: new Date() }),
  "denied",
);

// 3. Checkout → order for UI/UX only (Python stays in cart)
const me = { ...student, cart: [UIUX, PY], enrolledCourses: [] };
let orderId = "";
await check("place offline order", async () => {
  orderId = await O.placeManualOrder(me, [UIUX]);
});
assert("ordered course left the cart", JSON.stringify((await profile(student.uid)).cart) === JSON.stringify([PY]));
let o = await order(orderId);
assert("order is pending and needs a screenshot", o.status === "pending" && O.needsScreenshot(o));
assert("order total is ₹2,499", O.totalFor(o.courses) === 2499);
await check("student sees own orders", () => getDocs(query(collection(db, "orders"), where("uid", "==", student.uid))));
await check("student marks own order paid", () => updateDoc(doc(db, "orders", orderId), { status: "paid" }), "denied");

// 4. Upload payment screenshot
await check("student uploads payment screenshot", () => O.submitPaymentProof(orderId, "data:image/jpeg;base64,AAAA", "UTR1234"));
o = await order(orderId);
assert("order now under review", o.status === "pending" && !O.needsScreenshot(o) && o.paymentRef === "UTR1234");

// 5. Admin (bootstrap admin with a verified email)
await signOut(auth);
const adminCred = await createUserWithEmailAndPassword(auth, "admin@nuelsmart.com", PW);
await verifyEmail(adminCred.user.uid);
await as("admin@nuelsmart.com");
await auth.currentUser!.getIdToken(true);
await check("admin lists all orders", () => getDocs(collection(db, "orders")));
await check("admin saves payment details", () => O.savePaymentDetails({ upiId: "nuelsmart@okhdfc", payeeName: "Nuel Smart", accountNumber: "1234567890", ifsc: "HDFC0001234" }));
await check("admin adds a paid lesson video", () => L.saveLessonVideo(UIUX, "m1-l1", "https://youtu.be/dQw4w9WgXcQ", false));
await check("admin adds a free lesson video", () => L.saveLessonVideo(UIUX, "m1-l2", "https://youtu.be/aqz-KE-bpKQ", true));
await check("admin rejects the screenshot", () => O.rejectOrder(orderId, "Screenshot is blurry"));

// 6. Student re-uploads after rejection
await as("siri@test.com");
o = await order(orderId);
assert("student sees rejection reason", o.status === "rejected" && o.rejectReason === "Screenshot is blurry" && O.needsScreenshot(o));
await check("student reads payment details", () => getDoc(doc(db, "settings", "payment")));
await check("student re-uploads screenshot", () => O.submitPaymentProof(orderId, "data:image/png;base64,BBBB", ""));
o = await order(orderId);
assert("order back under review", o.status === "pending" && !o.rejectReason);

// 7. Admin accepts → enrolled
await as("admin@nuelsmart.com");
await check("admin accepts payment", () => O.markOrderPaid(o, adminCred.user.uid));
await as("siri@test.com");
const p = await profile(student.uid);
assert("student enrolled in UI/UX", p.enrolledCourses?.includes(UIUX), JSON.stringify(p.enrolledCourses));
assert("Python still in cart, not enrolled", p.cart?.includes(PY) && !p.enrolledCourses?.includes(PY));
assert("order marked paid", (await order(orderId)).status === "paid");
await check("student cancels a paid order", () => O.cancelOrder(orderId), "denied");

// 8. Course view
await check("student reads paid videos", () => getDoc(doc(db, "courseContent", UIUX, "paid", "videos")));
await check("student reads free videos", () => getDoc(doc(db, "courseContent", UIUX)));
await check("student completes a lesson", () => L.setLessonDone(student.uid, UIUX, "m1-l1", true));
await check("student submits an assignment", () => L.submitAssignment(student.uid, UIUX, "a1", "My research plan covers interviews, personas and the problem statement."));
await check("student requests mock interview", () => L.requestMockInterview(student.uid, UIUX, { preferredDate: "2026-11-01", topic: "Portfolio review", note: "" }));
await check("student ticks a document", () => L.setDocumentReady(student.uid, UIUX, "Resume tailored to the role", true));
await check("student grades themselves", () => setDoc(doc(db, "progress", `${student.uid}_${UIUX}`), { grades: { a1: { score: 100 } } }, { merge: true }), "denied");
await check("student writes own attendance", () => setDoc(doc(db, "progress", `${student.uid}_${UIUX}`), { attendance: [{ date: "x", title: "x", present: true }] }, { merge: true }), "denied");
await check("student opens Python (not paid)", () => L.setLessonDone(student.uid, PY, "m1-l1", true), "denied");

// 9. Admin records attendance, interview, grade
await as("admin@nuelsmart.com");
await check("admin records attendance", () => L.recordForLearner(student.uid, UIUX, { attendance: { date: "2026-10-22", title: "Live: UX basics", present: true } }));
await check("admin records interview result", () => L.recordForLearner(student.uid, UIUX, { interview: { date: "2026-10-22", topic: "Portfolio review", score: 8, feedback: "Good" } }));
await check("admin grades assignment", () => L.recordForLearner(student.uid, UIUX, { grade: { id: "a1", score: 85, feedback: "Nice" } }));
await as("siri@test.com");
const rec = (await getDoc(doc(db, "progress", `${student.uid}_${UIUX}`))).data()!;
assert("student sees progress, grade, attendance, interview", rec.completed.includes("m1-l1") && rec.grades.a1.score === 85 && rec.attendance.length === 1 && rec.interviews.length === 1 && !rec.interviewRequest);

// 10. Another student can't see or use any of it
await signOut(auth);
const other = await A.register({ name: "Other Student", email: "other@test.com", password: PW });
await check("other student reads Siri's order", () => getDoc(doc(db, "orders", orderId)), "denied");
await check("other student reads Siri's progress", () => getDoc(doc(db, "progress", `${student.uid}_${UIUX}`)), "denied");
await check("other student reads paid videos", () => getDoc(doc(db, "courseContent", UIUX, "paid", "videos")), "denied");
await check("other student uploads proof on Siri's order", () => O.submitPaymentProof(orderId, "data:image/jpeg;base64,AAAA", ""), "denied");
await check("other student changes payment details", () => O.savePaymentDetails({ upiId: "hacker@upi" }), "denied");
void other;

finish();
