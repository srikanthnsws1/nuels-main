/* eslint-disable @next/next/no-img-element -- inline SVG drawings from the question banks, shown as data-URL images */

/** A question bank drawing ("<svg …>") or plain text. Drawings render as images, so they can't run scripts. */
export const isFigure = (value?: string) => !!value && value.trimStart().startsWith("<svg");

const src = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function QuizFigure({ svg, alt, className }: { svg: string; alt: string; className?: string }) {
  return <img src={src(svg)} alt={alt} className={className ?? "mt-3 h-auto max-h-48 w-auto max-w-full rounded-lg"} />;
}

/** An answer option: its text, or its figure. */
export function OptionContent({ value, small }: { value: string; small?: boolean }) {
  if (!isFigure(value)) return <>{value}</>;
  return <QuizFigure svg={value} alt="Figure option" className={small ? "h-8 w-auto" : "h-16 w-auto max-w-full sm:h-20"} />;
}
