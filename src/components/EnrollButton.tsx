"use client";

import { useCallback, useState } from "react";
import EnrollModal from "./EnrollModal";
import type { Course } from "@/lib/courses";

export default function EnrollButton({ course, className, children }: { course: Course; className: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <EnrollModal course={course} onClose={close} />}
    </>
  );
}
