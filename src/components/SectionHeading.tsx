import Reveal from "./motion/Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <Reveal variant="fade">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              light ? "bg-white/10 text-spark-400" : "bg-forest-50 text-forest-600"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-spark-500" />
            {eyebrow}
          </span>
        </Reveal>
      )}
      <Reveal delay={100}>
        <h2
          className={`mt-4 text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl xl:text-[2.75rem] ${light ? "text-white" : "text-forest-950"}`}
        >
          {title}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={200}>
          <p className={`mt-4 text-sm leading-relaxed sm:text-base ${light ? "text-forest-100" : "text-slate-600"}`}>{subtitle}</p>
        </Reveal>
      )}
    </div>
  );
}
