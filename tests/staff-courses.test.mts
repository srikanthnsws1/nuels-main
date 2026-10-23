// Course management and employee accounts, including each designation's access.
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
const as = async (email: string) => {
  await signOut(auth);
  await signInWithEmailAndPassword(auth, email, PW);
};

// Admin (bootstrap, verified)
const adminCred = await createUserWithEmailAndPassword(auth, "admin@nuelsmart.com", PW);
await verifyEmail(adminCred.user.uid);
await as("admin@nuelsmart.com");
await auth.currentUser!.getIdToken(true);

// ---- Courses ----
console.log("\n# Courses");
await check("admin changes UI/UX price, mentor and level", () =>
  C.saveCourse("ui-ux-design-masterclass", { ...C.findCourse("ui-ux-design-masterclass")!, price: 1999, mentor: "Kavita Sharma", level: "Intermediate" }),
);
await check("admin adds a new course", () =>
  C.saveCourse(C.slugify("Data Science with R!"), {
    title: "Data Science with R!",
    description: "Learn R from scratch.",
    mentor: "Arjun Mehta",
    category: "Development",
    level: "Beginner",
    lessons: 0,
    hours: 10,
    price: 2999,
    oldPrice: 4999,
    image: "/images/cat-webdev.webp",
    modules: [
      { title: "R basics", topics: ["Installing R", "Vectors"] },
      { title: "Data frames", topics: ["dplyr", "ggplot2"] },
    ],
  }),
);
await wait(500);
const uiux = C.findCourse("ui-ux-design-masterclass");
assert("live catalog shows new UI/UX price/mentor/level", uiux?.price === 1999 && uiux.mentor === "Kavita Sharma" && uiux.level === "Intermediate");
const r = C.findCourse("data-science-with-r");
assert("new course listed with slug data-science-with-r", !!r && r.custom === true && r.price === 2999);
assert("new course page link", C.courseHref("data-science-with-r") === "/courses/view?c=data-science-with-r", C.courseHref("data-science-with-r"));
assert("built-in course keeps its static page link", C.courseHref("ui-ux-design-masterclass") === "/courses/ui-ux-design-masterclass");
assert("new course syllabus has 4 lessons", C.syllabusFor(r).flatMap((m) => m.topics).length === 4);
await check("admin hides Spoken English", () => C.setCourseHidden("spoken-english-communication", true));

// ---- Student buys the new course at the new price ----
console.log("\n# Student buys the new course");
await signOut(auth);
const student = await A.register({ name: "Ravi Student", email: "ravi@test.com", phone: "9876543210", password: PW });
await wait(300);
assert("student sees hidden course flagged", C.findCourse("spoken-english-communication")?.hidden === true);
await check("student adds new course to cart", () => O.addToCart(student.uid, "data-science-with-r"));
await check("student adds UI/UX to cart", () => O.addToCart(student.uid, "ui-ux-design-masterclass"));
assert("cart total uses live prices (2999 + 1999)", O.totalFor(["data-science-with-r", "ui-ux-design-masterclass"]) === 4998);
let orderId = "";
await check("student places order", async () => {
  orderId = await O.placeManualOrder({ ...student, cart: [] }, ["data-science-with-r", "ui-ux-design-masterclass"]);
});
await check("student uploads screenshot", () => O.submitPaymentProof(orderId, "data:image/jpeg;base64,AAAA", "UTR9"));
await check("student edits the catalog", () => C.saveCourse("hack", { ...r!, price: 1 }), "denied");
await check("student makes themselves staff", () => updateDoc(doc(db, "users", student.uid), { role: "employee", permissions: ["payments.approve"] }), "denied");
await check("student gives themselves permissions", () => updateDoc(doc(db, "users", student.uid), { permissions: ["payments.approve"] }), "denied");

// ---- Employees ----
console.log("\n# Employees");
await as("admin@nuelsmart.com");
let cashierId = "";
let hrId = "";
await check("admin creates a Cashier (stays signed in as admin)", async () => {
  const res = await S.createEmployee({
    name: "Kiran Cashier",
    email: "cashier@nuelsmart.com",
    password: PW,
    phone: "9123456780",
    designation: "Cashier",
    employeeNumber: "NS-EMP-001",
    permissions: S.defaultPermissions.Cashier,
  });
  cashierId = res.uid;
  assert("cashier got an E staff ID", /^E\d{4}$/.test(res.memberId), res.memberId);
});
assert("admin still signed in after creating employee", auth.currentUser?.email === "admin@nuelsmart.com", auth.currentUser?.email);
await check("admin creates an HR employee", async () => {
  hrId = (
    await S.createEmployee({
      name: "Hema HR",
      email: "hr@nuelsmart.com",
      password: PW,
      phone: "9123456781",
      designation: "HR",
      employeeNumber: "NS-EMP-002",
      permissions: S.defaultPermissions.HR,
    })
  ).uid;
});
await check("admin creates a Coordinator", () =>
  S.createEmployee({
    name: "Charan Coordinator",
    email: "coord@nuelsmart.com",
    password: PW,
    phone: "9123456782",
    designation: "Coordinator",
    employeeNumber: "NS-EMP-003",
    permissions: S.defaultPermissions.Coordinator,
  }),
);
await check("admin edits HR's phone", () => S.updateEmployee(hrId, { phone: "9000000000" }));
await check("admin lists employees", () => getDocs(query(collection(db, "users"), where("role", "==", "employee"))));

// Cashier: payments yes, courses/staff no
await as("cashier@nuelsmart.com");
const cashier = (await getDoc(doc(db, "users", cashierId))).data()!;
assert("cashier profile: role, designation, number", cashier.role === "employee" && cashier.designation === "Cashier" && cashier.employeeNumber === "NS-EMP-001");
assert("cashier lands on /staff", A.homeFor.employee === "/staff");
await check("cashier lists all orders", () => getDocs(collection(db, "orders")));
const order = { id: orderId, ...(await getDoc(doc(db, "orders", orderId))).data() } as never;
await check("cashier accepts the payment", () => O.markOrderPaid(order, cashierId));
await check("cashier edits a course", () => C.saveCourse("ui-ux-design-masterclass", { ...uiux!, price: 10 }), "denied");
await check("cashier lists employees", () => getDocs(query(collection(db, "users"), where("role", "==", "employee"))), "denied");
await check("cashier grants self more permissions", () => updateDoc(doc(db, "users", cashierId), { permissions: ["courses.manage"] }), "denied");
await check("cashier changes payment details", () => O.savePaymentDetails({ upiId: "x@upi" }), "denied");
await check("cashier updates own photo", () => A.updateProfilePhoto(cashierId, "data:image/jpeg;base64,AAAA"));

// Student now enrolled in both
await as("ravi@test.com");
const s = (await getDoc(doc(db, "users", student.uid))).data()!;
assert("student enrolled in new course + UI/UX", s.enrolledCourses.includes("data-science-with-r") && s.enrolledCourses.includes("ui-ux-design-masterclass"));
await check("student opens new course (progress)", () => L.setLessonDone(student.uid, "data-science-with-r", "m1-l1", true));

// HR: staff directory and students, not payments
await as("hr@nuelsmart.com");
await check("HR lists employees", () => getDocs(query(collection(db, "users"), where("role", "==", "employee"))));
await check("HR lists students", () => getDocs(query(collection(db, "users"), where("role", "==", "student"))));
await check("HR reads orders", () => getDocs(collection(db, "orders")), "denied");
await check("HR edits another employee", () => updateDoc(doc(db, "users", cashierId), { permissions: [] }), "denied");

// Coordinator: learners + videos, not payments
await as("coord@nuelsmart.com");
await check("coordinator records attendance", () =>
  L.recordForLearner(student.uid, "data-science-with-r", { attendance: { date: "2026-10-22", title: "Live: R basics", present: true } }),
);
await check("coordinator adds a lesson video", () => L.saveLessonVideo("data-science-with-r", "m1-l1", "https://youtu.be/dQw4w9WgXcQ", false));
await check("coordinator reads orders", () => getDocs(collection(db, "orders")), "denied");
await check("coordinator changes student's completed lessons", () => setDoc(doc(db, "progress", `${student.uid}_data-science-with-r`), { completed: [] }, { merge: true }), "denied");

// Deactivated employee loses access
await as("admin@nuelsmart.com");
await check("admin deactivates the cashier", () => S.updateEmployee(cashierId, { status: "inactive" }));
await as("cashier@nuelsmart.com");
await check("inactive cashier reads orders", () => getDocs(collection(db, "orders")), "denied");
await check("inactive cashier signs in through the site", () => A.signIn("cashier@nuelsmart.com", PW, true), "denied");

// Admin "Add user" creates a real login; deactivating it blocks sign-in
console.log("\n# Add user / deactivate");
await as("admin@nuelsmart.com");
let tutor = { uid: "", memberId: "" };
await check("admin adds a tutor login", async () => {
  tutor = await S.createAccount("tutor@test.com", PW, { name: "Tara Tutor", role: "mentor" }, "T");
});
assert("tutor got a T member ID", /^T\d{4}$/.test(tutor.memberId), tutor.memberId);
const dupCode = await S.createAccount("tutor@test.com", PW, { name: "Dup", role: "student" }, "S").then(
  () => "created",
  (err: { code?: string }) => err.code ?? String(err),
);
assert("duplicate email is refused", dupCode === "auth/email-already-in-use", dupCode);
assert("admin still signed in after the failed attempt", auth.currentUser?.email === "admin@nuelsmart.com", auth.currentUser?.email ?? "signed out");
await check("new tutor signs in through the site", async () => {
  await signOut(auth);
  const u = await A.signIn("tutor@test.com", PW, true);
  if (u.role !== "mentor" || u.memberId !== tutor.memberId) throw new Error(`unexpected profile ${u.role} ${u.memberId}`);
});
await as("admin@nuelsmart.com");
await check("admin deactivates the student", () => updateDoc(doc(db, "users", student.uid), { status: "inactive" }));
await signOut(auth);
await check("deactivated student signs in through the site", () => A.signIn("ravi@test.com", PW, true), "denied");

finish();
