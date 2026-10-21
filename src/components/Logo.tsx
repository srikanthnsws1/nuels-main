import Image from "next/image";
import Link from "next/link";

export default function Logo({ light = false, priority = false }: { light?: boolean; priority?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="nuelsmart home">
      <span className={light ? "rounded-xl bg-white p-1" : ""}>
        <Image src="/images/logo-mark-sm.webp" alt="" width={36} height={36} className="h-8 w-8 sm:h-9 sm:w-9" priority={priority} />
      </span>
      <span className={`text-lg font-semibold tracking-tight sm:text-xl ${light ? "text-white" : "text-forest-700"}`}>
        nuelsmart
      </span>
    </Link>
  );
}
