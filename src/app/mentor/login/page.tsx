import type { Metadata } from "next";
import TutorLoginPage from "@/app/tutor/login/page";

export const metadata: Metadata = {
  title: "Mentor Login | Nuels",
  description: "Sign in to the Nuels mentor portal.",
  robots: { index: false, follow: false },
};

export default function MentorLoginAlias() {
  return <TutorLoginPage />;
}
