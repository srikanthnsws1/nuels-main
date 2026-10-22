import type { Metadata } from "next";
import { Suspense } from "react";
import LearnPage from "@/components/learn/LearnPage";

export const metadata: Metadata = {
  title: "My Course",
  robots: { index: false, follow: false },
};

export default function Learn() {
  return (
    <Suspense>
      <LearnPage />
    </Suspense>
  );
}
