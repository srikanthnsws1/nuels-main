import type { Metadata } from "next";
import Dashboard from "@/components/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "My Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <Dashboard />;
}
