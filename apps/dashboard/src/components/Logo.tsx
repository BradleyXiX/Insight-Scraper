import Image from "next/image";

export function Logo({ variant = "full", size = 32 }: { variant?: "full" | "mark"; size?: number }) {
  if (variant === "mark") {
    return <Image src="/mark.svg" alt="Insight Scraper" width={size} height={size} unoptimized priority />;
  }
  return (
    <span className="flex items-center gap-3">
      <Image src="/mark.svg" alt="" width={size} height={size} unoptimized priority />
      <span className="heading-6 text-foreground">
        <span className="font-semibold">INSIGHT</span>
        <span className="font-mono font-medium"> SCRAPER</span>
      </span>
    </span>
  );
}
