import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";

/**
 * AI mock tests: one per lesson, unlocked once the learner marks the lesson done.
 * Claude writes 10 multiple-choice questions for that lesson; the correct answers stay on the
 * server (`mockTests/{uid}_{slug}_{lessonId}`, unreadable by learners until submitted).
 * Each test can be taken once, within TEST_MINUTES; the score is also copied into
 * `progress/{uid}_{slug}.mockTests` for the course page and performance report.
 *
 * Setup (see MOCK-TESTS-SETUP.md):
 *   npx firebase-tools functions:secrets:set ANTHROPIC_API_KEY
 */
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");
/** Claude model that writes the questions. claude-haiku-5-5 is a much cheaper option. */
const quizModel = defineString("MOCKTEST_MODEL", { default: "claude-opus-5-5" });

const QUESTIONS = 10;
const TEST_MINUTES = 10;
/** Extra seconds accepted after the deadline for network delays on auto-submit. */
const GRACE_SECONDS = 45;

const options = { region: "asia-south1", secrets: [anthropicKey], timeoutSeconds: 120, memory: "512MiB" as const };

// ---------- syllabus (mirrors src/data/learning.ts: lesson ids are "m{module}-l{topic}") ----------

type Syllabus = { title: string; topics: string[] }[];

/** Built-in syllabi, used when a course has no edited syllabus in `catalog/{slug}`. Keep in sync with src/data/courseDetails.ts. */
const BUILT_IN: Record<string, { title: string; level: string; modules: Syllabus }> = {
  "ui-ux-design-masterclass": {
    title: "UI/UX Design Masterclass",
    level: "Beginner",
    modules: [
      { title: "Foundations of UX", topics: ["What UI and UX designers do", "Design thinking process", "Heuristics and usability basics"] },
      { title: "User research", topics: ["Interview planning", "Personas and journey maps", "Defining the problem"] },
      { title: "Wireframing & information architecture", topics: ["Sitemaps and user flows", "Low-fidelity wireframes", "Content hierarchy"] },
      { title: "Visual design in Figma", topics: ["Auto layout and constraints", "Typography and colour systems", "Responsive layouts"] },
      { title: "Prototyping & testing", topics: ["Interactive prototypes", "Usability testing sessions", "Iterating from feedback"] },
      { title: "Design systems & portfolio", topics: ["Components and variants", "Writing a case study", "Portfolio review with your mentor"] },
    ],
  },
  "full-stack-web-development-bootcamp": {
    title: "Full-Stack Web Development Bootcamp",
    level: "Intermediate",
    modules: [
      { title: "Web fundamentals", topics: ["HTML and accessibility", "CSS layout with Flexbox and Grid", "Responsive design"] },
      { title: "JavaScript in depth", topics: ["Functions, objects and arrays", "Async code and fetch", "Debugging in the browser"] },
      { title: "React", topics: ["Components, props and state", "Hooks and data fetching", "Routing and forms"] },
      { title: "Back end with Node.js", topics: ["Express servers and REST APIs", "Middleware and validation", "Authentication"] },
      { title: "Databases", topics: ["SQL fundamentals", "MongoDB and data modelling", "Connecting APIs to databases"] },
      { title: "Deployment & capstone", topics: ["Git workflow and GitHub", "Deploying front end and back end", "Capstone project review"] },
    ],
  },
  "python-for-data-analysis": {
    title: "Python for Data Analysis",
    level: "Beginner",
    modules: [
      { title: "Python basics", topics: ["Variables and data types", "Loops and conditions", "Functions and modules"] },
      { title: "Working with data", topics: ["Jupyter notebooks", "Reading CSV and Excel files", "Data types and missing values"] },
      { title: "pandas in depth", topics: ["Filtering and sorting", "Grouping and aggregating", "Merging datasets"] },
      { title: "NumPy & statistics", topics: ["Arrays and vectorised maths", "Descriptive statistics", "Spotting outliers"] },
      { title: "Data visualisation", topics: ["Matplotlib basics", "Seaborn charts", "Choosing the right chart"] },
      { title: "Analysis projects", topics: ["Sales data case study", "Writing up insights", "Mentor project review"] },
    ],
  },
  "social-media-content-marketing": {
    title: "Social Media & Content Marketing",
    level: "Beginner",
    modules: [
      { title: "Marketing foundations", topics: ["Audience and positioning", "The marketing funnel", "Setting goals and KPIs"] },
      { title: "Content strategy", topics: ["Content pillars", "Content calendars", "Repurposing content"] },
      { title: "Platform playbooks", topics: ["Instagram and Reels", "LinkedIn for brands and creators", "YouTube basics"] },
      { title: "Copywriting & creatives", topics: ["Hooks and captions", "Short-form video scripts", "Design tools for marketers"] },
      { title: "Paid social", topics: ["Meta Ads Manager", "Audiences and budgets", "Testing creatives"] },
      { title: "Analytics & reporting", topics: ["Reading platform insights", "Monthly reports", "Campaign case study review"] },
    ],
  },
  "business-strategy-for-founders": {
    title: "Business Strategy for Founders",
    level: "Advanced",
    modules: [
      { title: "Strategy foundations", topics: ["What strategy is and is not", "Business model canvas", "Choosing where to play"] },
      { title: "Customer & market", topics: ["Customer discovery interviews", "Market sizing", "Competitor analysis"] },
      { title: "Pricing", topics: ["Value-based pricing", "Pricing models", "Testing price points"] },
      { title: "Go-to-market", topics: ["Positioning and messaging", "Channels and partnerships", "Sales basics for founders"] },
      { title: "Finance for founders", topics: ["Unit economics", "Simple financial models", "Cash flow planning"] },
      { title: "Strategy review", topics: ["One-page strategy", "Pitch narrative", "Mentor strategy session"] },
    ],
  },
  "spoken-english-communication": {
    title: "Spoken English & Communication",
    level: "Beginner",
    modules: [
      { title: "Speaking foundations", topics: ["Everyday conversation", "Common grammar in speech", "Building vocabulary"] },
      { title: "Pronunciation", topics: ["Sounds and word stress", "Intonation", "Speaking speed and clarity"] },
      { title: "Workplace English", topics: ["Meetings and calls", "Giving updates", "Polite disagreement"] },
      { title: "Interview English", topics: ["Tell me about yourself", "Answering with examples", "Mock interviews"] },
      { title: "Presentations", topics: ["Structuring a talk", "Using slides well", "Handling questions"] },
      { title: "Professional writing", topics: ["Emails and messages", "Clear, short sentences", "Final speaking assessment"] },
    ],
  },
};

type LessonInfo = { courseTitle: string; level: string; moduleTitle: string; lessonTitle: string; moduleTopics: string[] };

/** Looks up the lesson on the server so the topic can't be changed by the learner. */
async function lessonInfo(slug: string, lessonId: string): Promise<LessonInfo> {
  const m = /^m(\d{1,2})-l(\d{1,2})$/.exec(lessonId);
  if (!m) throw new HttpsError("invalid-argument", "Invalid lesson.");
  const catalog = (await getFirestore().doc(`catalog/${slug}`).get()).data() as
    | { title?: string; level?: string; modules?: Syllabus }
    | undefined;
  const builtIn = BUILT_IN[slug];
  const modules = catalog?.modules?.length ? catalog.modules : builtIn?.modules;
  const mod = modules?.[Number(m[1]) - 1];
  const topic = mod?.topics?.[Number(m[2]) - 1];
  if (!mod || !topic) throw new HttpsError("not-found", "Lesson not found.");
  return {
    courseTitle: catalog?.title ?? builtIn?.title ?? slug,
    level: catalog?.level ?? builtIn?.level ?? "Beginner",
    moduleTitle: mod.title,
    lessonTitle: topic,
    moduleTopics: mod.topics,
  };
}

// ---------- question generation ----------

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.number().int(),
      explanation: z.string(),
    }),
  ),
});

type StoredQuestion = { question: string; options: string[]; answer: number; explanation: string };

const SYSTEM = `You write multiple-choice mock-test questions for Nuel Smart, an online learning platform in India where every course is taught by an industry mentor.

Each test checks whether a learner understood one lesson. Write questions that test understanding and application of that lesson's topic (concepts, reading short code or scenarios, choosing the right approach), not trivia or wording tricks. Mix easy, medium and a few harder questions suited to the course level.

Every question has exactly four options and exactly one correct option. Make the wrong options plausible mistakes a learner might make. Do not use "all of the above", "none of the above" or "both A and B". Keep questions and options short enough to read on a phone; put any code inline with backticks. "answer" is the 0-based index of the correct option. "explanation" is one or two sentences saying why the correct option is right, shown to the learner after they submit.`;

async function generateQuestions(info: LessonInfo): Promise<StoredQuestion[]> {
  const client = new Anthropic({ apiKey: anthropicKey.value() });
  const prompt = `Course: ${info.courseTitle} (${info.level} level)
Module: ${info.moduleTitle} (topics in this module: ${info.moduleTopics.join("; ")})
Lesson for this test: ${info.lessonTitle}

Write ${QUESTIONS} questions about this lesson.`;

  const model = quizModel.value();
  // Server-side refusal fallback isn't available for Haiku models; send it only where supported.
  const fallback = model.includes("haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
  const response = await client.beta.messages.parse({
    model,
    max_tokens: 16000,
    ...fallback,
    output_config: { effort: "low", format: betaZodOutputFormat(QuizSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") throw new HttpsError("unavailable", "Couldn't create this test right now. Please try again later.");
  if (response.stop_reason === "max_tokens") throw new HttpsError("unavailable", "Couldn't create this test. Please try again.");

  const valid = (response.parsed_output?.questions ?? []).filter(
    (q) => q.question.trim() && q.options.length === 4 && q.options.every((o) => o.trim()) && q.answer >= 0 && q.answer <= 3,
  );
  if (valid.length < QUESTIONS) throw new HttpsError("unavailable", "Couldn't create this test. Please try again.");

  // Shuffle each question's options so the correct answer isn't always in the same place.
  return valid.slice(0, QUESTIONS).map((q) => {
    const order = [0, 1, 2, 3];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return {
      question: q.question.trim(),
      options: order.map((i) => q.options[i].trim()),
      answer: order.indexOf(q.answer),
      explanation: q.explanation.trim(),
    };
  });
}

// ---------- shared ----------

type TestDoc = {
  uid: string;
  slug: string;
  lessonId: string;
  lessonTitle: string;
  questions: StoredQuestion[];
  startedAt: Timestamp;
  deadline: Timestamp;
  answers?: (number | null)[];
  score?: number;
  submittedAt?: Timestamp;
};

const SLUG = /^[a-z0-9-]{1,60}$/;

function parseArgs(data: unknown) {
  const { slug, lessonId } = (data ?? {}) as { slug?: unknown; lessonId?: unknown };
  if (typeof slug !== "string" || !SLUG.test(slug) || typeof lessonId !== "string" || !/^m\d{1,2}-l\d{1,2}$/.test(lessonId)) {
    throw new HttpsError("invalid-argument", "Invalid test.");
  }
  return { slug, lessonId };
}

/** What the learner sees after submitting: their answers, the correct ones and why. */
function result(t: TestDoc) {
  return {
    status: "submitted" as const,
    lessonTitle: t.lessonTitle,
    score: t.score ?? 0,
    total: t.questions.length,
    questions: t.questions,
    answers: t.answers ?? [],
    submittedAt: t.submittedAt?.toMillis() ?? Date.now(),
  };
}

/** Grades and saves a test (once); unanswered or late questions count as wrong. */
async function finalize(ref: FirebaseFirestore.DocumentReference, answers: (number | null)[]) {
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    const t = (await tx.get(ref)).data() as TestDoc;
    if (t.submittedAt) return t;
    const clean = t.questions.map((_, i) => (Number.isInteger(answers[i]) && (answers[i] as number) >= 0 && (answers[i] as number) <= 3 ? (answers[i] as number) : null));
    const score = t.questions.reduce((s, q, i) => s + (clean[i] === q.answer ? 1 : 0), 0);
    const submittedAt = Timestamp.now();
    tx.update(ref, { answers: clean, score, submittedAt });
    tx.set(
      db.doc(`progress/${t.uid}_${t.slug}`),
      { mockTests: { [t.lessonId]: { score, total: t.questions.length, submittedAt } }, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { ...t, answers: clean, score, submittedAt };
  });
}

// ---------- callable functions ----------

/**
 * Starts (or resumes) the mock test for one lesson. Returns the questions without answers and the
 * deadline; if the test was already submitted or its time ran out, returns the result instead.
 */
export const startMockTest = onCall(options, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Please log in again.");
  const { slug, lessonId } = parseArgs(req.data);
  const db = getFirestore();
  const ref = db.doc(`mockTests/${uid}_${slug}_${lessonId}`);

  let snap = await ref.get();
  if (!snap.exists) {
    const [user, progress] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`progress/${uid}_${slug}`).get()]);
    if (!(user.data()?.enrolledCourses ?? []).includes(slug)) throw new HttpsError("permission-denied", "Enroll in this course to take its tests.");
    if (!(progress.data()?.completed ?? []).includes(lessonId)) throw new HttpsError("failed-precondition", "Finish this lesson first to unlock its test.");

    const info = await lessonInfo(slug, lessonId);
    let questions: StoredQuestion[];
    try {
      questions = await generateQuestions(info);
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      if (err instanceof Anthropic.RateLimitError) {
        logger.warn("Claude rate limited", { slug, lessonId });
        throw new HttpsError("resource-exhausted", "Lots of tests are being created right now. Please try again in a minute.");
      }
      if (err instanceof Anthropic.AuthenticationError) {
        logger.error("Anthropic API key rejected; check the ANTHROPIC_API_KEY secret");
        throw new HttpsError("internal", "Mock tests aren't available right now.");
      }
      if (err instanceof Anthropic.APIError) {
        logger.error("Claude API error", { status: err.status, message: err.message });
        throw new HttpsError("unavailable", "Couldn't create this test. Please try again.");
      }
      throw err;
    }

    const startedAt = Timestamp.now();
    const deadline = Timestamp.fromMillis(startedAt.toMillis() + TEST_MINUTES * 60_000);
    const doc: TestDoc = { uid, slug, lessonId, lessonTitle: info.lessonTitle, questions, startedAt, deadline };
    try {
      await ref.create(doc); // fails if a parallel request created it first; we use that one
    } catch {
      /* already exists */
    }
    snap = await ref.get();
  }

  let test = snap.data() as TestDoc;
  if (!test.submittedAt && Date.now() > test.deadline.toMillis() + GRACE_SECONDS * 1000) {
    test = await finalize(ref, []); // time ran out while away: unanswered questions count as wrong
  }
  if (test.submittedAt) return result(test);

  return {
    status: "in_progress" as const,
    lessonTitle: test.lessonTitle,
    deadline: test.deadline.toMillis(),
    serverNow: Date.now(),
    questions: test.questions.map((q) => ({ question: q.question, options: q.options })),
  };
});

/** Submits answers once. A submission after the deadline (plus grace) counts every question as unanswered. */
export const submitMockTest = onCall(options, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Please log in again.");
  const { slug, lessonId } = parseArgs(req.data);
  const raw = (req.data as { answers?: unknown }).answers;
  const answers = Array.isArray(raw) ? raw.slice(0, QUESTIONS).map((a) => (typeof a === "number" ? a : null)) : [];

  const ref = getFirestore().doc(`mockTests/${uid}_${slug}_${lessonId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Start the test first.");
  const test = snap.data() as TestDoc;
  if (test.submittedAt) return result(test);

  const late = Date.now() > test.deadline.toMillis() + GRACE_SECONDS * 1000;
  return result(await finalize(ref, late ? [] : answers));
});
