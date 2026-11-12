/**
 * Daily Quiz: one paper a day set by the learner's class (10, 25 or 30 questions), 15 minutes, one attempt,
 * open 5:00 AM – 7:00 PM IST.
 * Times are India time whatever the device's time zone; firestore.rules enforce the same window.
 */

export const QUIZ_MINUTES = 15;
export const OPEN_MINUTE = 5 * 60; // 5:00 AM IST
export const CLOSE_MINUTE = 19 * 60; // 7:00 PM IST
export const OPEN_LABEL = "5:00 AM";
export const CLOSE_LABEL = "7:00 PM";
/** sessionStorage flag set at login / registration: open the quiz only if there is one to take now. */
export const QUIZ_LANDING_KEY = "nsq:landing";

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** Days since 1 Jan 1970 in India time: the quiz "date" (also part of each attempt's id). */
export const istDay = (ms = Date.now()) => Math.floor((ms + IST_OFFSET_MS) / DAY_MS);
/** Minutes past midnight in India time. */
export const istMinute = (ms = Date.now()) => Math.floor(((ms + IST_OFFSET_MS) % DAY_MS) / 60_000);
export const quizOpenAt = (ms = Date.now()) => {
  // Local emulator testing only (both flags are build-time; production builds never set them).
  if (process.env.NEXT_PUBLIC_USE_EMULATORS === "1" && process.env.NEXT_PUBLIC_QUIZ_ALWAYS_OPEN === "1") return true;
  const m = istMinute(ms);
  return m >= OPEN_MINUTE && m < CLOSE_MINUTE;
};

/** A quiz day as a Date at noon UTC, safe to format in any time zone. */
export const dayToDate = (day: number) => new Date(day * DAY_MS + 12 * 3600_000);
export const dayLabel = (day: number) =>
  dayToDate(day).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "NSQ261110-S9807": the date plus the learner's member ID, so every paper has its own code. */
export function quizCode(day: number, memberId: string | undefined, uid: string) {
  const d = dayToDate(day);
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `NSQ${ymd}-${memberId || uid.slice(0, 5).toUpperCase()}`;
}

import patterns from "./quizPatterns.json";

export type QuizGroup = {
  id: string;
  label: string;
  /** Questions taken from each section's bank (5, or 3 for Class 10's ten subjects). */
  perSection: number;
  /** Classes 1–3: picture questions shown large. */
  pictures?: boolean;
  /** Old pattern kept only so earlier papers still display. */
  legacy?: boolean;
  /** Question banks, one per section, in paper order. */
  banks: string[];
};

const groupMap = patterns.groups as Record<string, Omit<QuizGroup, "id">>;
export const allQuizGroups: QuizGroup[] = Object.entries(groupMap).map(([id, g]) => ({ id, ...g }));
/** Groups a learner can be placed in today (legacy ones excluded). */
export const quizGroups = allQuizGroups.filter((g) => !g.legacy);
export const groupById = (id?: string) => allQuizGroups.find((g) => g.id === id);

/** Section title for a bank, e.g. "ALL-A" → "Health & Wellness". */
export const bankTitle = (bankId: string) => (patterns.banks as Record<string, string>)[bankId] ?? bankId;
/** The question banks a group's paper is drawn from, in section order. */
export const bankIdsFor = (group: string) => groupById(group)?.banks ?? [];
export const perSectionFor = (group: string) => groupById(group)?.perSection ?? 5;
export const questionsFor = (group: string) => bankIdsFor(group).length * perSectionFor(group);

/** Section colours by position (up to 10 sections). */
export const sectionColors: { color: string; soft: string; text: string }[] = [
  { color: "bg-rose-600", soft: "bg-rose-50", text: "text-rose-700" },
  { color: "bg-blue-700", soft: "bg-blue-50", text: "text-blue-700" },
  { color: "bg-emerald-600", soft: "bg-emerald-50", text: "text-emerald-700" },
  { color: "bg-orange-500", soft: "bg-orange-50", text: "text-orange-700" },
  { color: "bg-violet-600", soft: "bg-violet-50", text: "text-violet-700" },
  { color: "bg-cyan-700", soft: "bg-cyan-50", text: "text-cyan-700" },
  { color: "bg-amber-600", soft: "bg-amber-50", text: "text-amber-700" },
  { color: "bg-fuchsia-600", soft: "bg-fuchsia-50", text: "text-fuchsia-700" },
  { color: "bg-teal-600", soft: "bg-teal-50", text: "text-teal-700" },
  { color: "bg-indigo-600", soft: "bg-indigo-50", text: "text-indigo-700" },
];
export const sectionLetter = (i: number) => String.fromCharCode(65 + i);

/** A paper's sections in order: the group's pattern, or the stored picks for an unknown group. */
export function paperSections(group: string, pickedBanks: string[]) {
  const order = bankIdsFor(group).filter((b) => pickedBanks.includes(b));
  const rest = pickedBanks.filter((b) => !order.includes(b)).sort();
  return [...order, ...rest].map((bankId, i) => ({ bankId, letter: sectionLetter(i), title: bankTitle(bankId), ...sectionColors[i % sectionColors.length] }));
}

// ---------------- Class / standard / course (chosen at registration) ----------------

export type StudyClass = { id: string; label: string; group: string };
const cls = (id: string, label: string, group: string): StudyClass => ({ id, label, group });

/** Registration drop-down, grouped; each option decides the learner's daily quiz pattern. */
export const studyClassGroups: { label: string; options: StudyClass[] }[] = [
  {
    label: "School",
    options: [
      cls("C1", "Class 1", "K1"),
      cls("C2", "Class 2", "K2"),
      cls("C3", "Class 3", "K3"),
      ...[4, 5].map((n) => cls(`C${n}`, `Class ${n}`, "A")),
      ...[6, 7, 8].map((n) => cls(`C${n}`, `Class ${n}`, "B")),
      cls("C9", "Class 9", "C"),
      cls("C10", "Class 10", "X"),
    ],
  },
  { label: "Navodaya", options: [cls("NAV", "Navodaya (JNVST entrance)", "NAV")] },
  {
    label: "Intermediate",
    options: [
      cls("INT-MPC", "Intermediate – MPC", "IMPC"),
      cls("INT-BIPC", "Intermediate – BiPC", "IBPC"),
      cls("INT-DIP", "Intermediate – Diploma", "IDIP"),
      cls("INT-IIT", "Intermediate – IIT (JEE)", "IIIT"),
      cls("INT-OTH", "Intermediate – Others (MEC / CEC / HEC)", "IOTH"),
    ],
  },
  {
    label: "Entrance exams",
    options: [cls("NEET", "NEET (BiPC)", "NEET"), cls("EAMCET", "EAMCET (MPC)", "EAM")],
  },
  {
    label: "Degree",
    options: [
      cls("DEG-BSC", "Degree – B.Sc", "PRO"),
      cls("DEG-BCOM", "Degree – B.Com", "PRO"),
      cls("DEG-BBA", "Degree – BBA", "PRO"),
      cls("DEG-CMP", "Degree – Computers (BCA / B.Sc CS)", "PRO"),
      cls("DEG-MPC", "Degree – MPC", "PRO"),
      cls("DEG-MEC", "Degree – MEC", "PRO"),
      cls("DEG-DIP", "Diploma (Polytechnic)", "PRO"),
      cls("DEG-OTH", "Degree – Others", "PRO"),
    ],
  },
  {
    label: "B.Tech",
    options: [
      cls("BT-CSE", "B.Tech – CSE", "PRO"),
      cls("BT-AIML", "B.Tech – CSE (AI & ML / Data Science)", "PRO"),
      cls("BT-IT", "B.Tech – IT", "PRO"),
      cls("BT-ECE", "B.Tech – ECE", "PRO"),
      cls("BT-EEE", "B.Tech – EEE", "PRO"),
      cls("BT-MECH", "B.Tech – Mechanical", "PRO"),
      cls("BT-CIVIL", "B.Tech – Civil", "PRO"),
      cls("BT-OTH", "B.Tech – Other branch", "PRO"),
    ],
  },
  {
    label: "Post-graduation & others",
    options: [cls("MBA", "MBA", "PRO"), cls("MCA", "MCA", "PRO"), cls("OTHER", "Others", "PRO")],
  },
];
export const studyClasses = studyClassGroups.flatMap((g) => g.options);
export const studyClassById = (id?: string) => studyClasses.find((c) => c.id === id);
export const groupForClass = (id?: string) => studyClassById(id)?.group;
