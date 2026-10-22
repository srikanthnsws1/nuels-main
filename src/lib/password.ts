/** Rules every new password must pass; shown as a live checklist under password fields. */
export const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const strengthStyles = ["bg-forest-100", "bg-red-400", "bg-amber-400", "bg-spark-500", "bg-forest-600"];
export const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
