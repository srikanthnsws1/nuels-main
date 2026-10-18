import { courses, mentors, type Course } from "./site";

// Sample learner data for the student dashboard until a real API exists.

export type Enrollment = {
  course: Course;
  progress: number;
  lessonsDone: number;
  nextLesson: string;
};

const byTitle = (title: string) => courses.find((c) => c.title === title)!;
const mentorImage = (name: string) => mentors.find((m) => m.name === name)!.image;

export const enrollments: Enrollment[] = [
  { course: byTitle("UI/UX Design Masterclass"), progress: 68, lessonsDone: 29, nextLesson: "Designing responsive layouts in Figma" },
  { course: byTitle("Python for Data Analysis"), progress: 34, lessonsDone: 13, nextLesson: "Grouping and aggregating with pandas" },
  { course: byTitle("Spoken English & Communication"), progress: 100, lessonsDone: 34, nextLesson: "Course completed" },
];

export const liveSessions = [
  { title: "Portfolio review: case study structure", mentor: "Priya Nair", image: mentorImage("Priya Nair"), day: "Today", time: "6:00 PM" },
  { title: "Doubt clearing: pandas & NumPy", mentor: "Arjun Mehta", image: mentorImage("Arjun Mehta"), day: "Wed", time: "7:30 PM" },
  { title: "Mock interview practice", mentor: "Kavita Sharma", image: mentorImage("Kavita Sharma"), day: "Sat", time: "11:00 AM" },
];

export const weeklyHours = [
  { day: "Mon", hours: 1.5 },
  { day: "Tue", hours: 2.2 },
  { day: "Wed", hours: 0.8 },
  { day: "Thu", hours: 3 },
  { day: "Fri", hours: 2.4 },
  { day: "Sat", hours: 1.2 },
  { day: "Sun", hours: 0.5 },
];

export const assignments = [
  { title: "Mobile app onboarding flow", course: "UI/UX Design Masterclass", due: "Due in 2 days", status: "In progress" },
  { title: "Sales data cleaning notebook", course: "Python for Data Analysis", due: "Due in 5 days", status: "Not started" },
  { title: "Self-introduction recording", course: "Spoken English & Communication", due: "Submitted", status: "Reviewed" },
] as const;

export const recommended = courses.filter((c) => !enrollments.some((e) => e.course.title === c.title)).slice(0, 3);
