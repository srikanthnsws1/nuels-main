import type { Metadata } from "next";
import StaffDashboard from "@/components/dashboard/StaffDashboard";

export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: { index: false, follow: false },
};

export default function StaffPage() {
  return <StaffDashboard />;
}
