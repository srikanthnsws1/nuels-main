import type { Metadata } from "next";
import MentorDashboard from "@/components/dashboard/MentorDashboard";

export const metadata: Metadata = {
  title: "Mentor Dashboard",
  robots: { index: false, follow: false },
};

export default function MentorPage() {
  return <MentorDashboard />;
}
