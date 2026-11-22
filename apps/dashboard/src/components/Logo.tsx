import Image from "next/image";
import Link from "next/link";

export interface LogoProps {
  variant?: "full" | "mark";
  size?: number;
  href?: string | null;
}

export function Logo({ variant = "full", size = 32, href = "/" }: LogoProps) {
  const isLinked = href !== null;
  const content =
    variant === "mark" ? (
      <Image
        src="/mark.svg"
        alt={isLinked ? "" : "Insight Scraper"}
        width={size}
        height={size}
        unoptimized
        priority
      />
    ) : (
      <span className="flex items-center gap-3">
        <Image src="/mark.svg" alt="" width={size} height={size} unoptimized priority />
        <span className="heading-6 text-foreground">
          <span className="font-semibold">INSIGHT</span>
          <span className="font-mono font-medium"> SCRAPER</span>
        </span>
      </span>
    );

  if (!isLinked) {
    return content;
  }

  return (
    <Link
      href={href}
      aria-label="Insight Scraper home"
      className="inline-flex items-center hover:opacity-90 transition-opacity"
    >
      {content}
    </Link>
  );
}
