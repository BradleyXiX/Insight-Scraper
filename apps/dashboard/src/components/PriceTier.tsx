import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export interface PriceTierProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  featured?: boolean;
}

export function PriceTier({
  name,
  price,
  period,
  description,
  features,
  featured = false,
}: PriceTierProps): React.ReactElement {
  return (
    <div
      className={`panel flex flex-col p-8 sm:p-10 bg-surface border ${
        featured ? "border-accent" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-semibold text-white mb-1">{name}</h3>
          <p className="text-sm text-foreground/70">{description}</p>
        </div>
        {featured && (
          <div className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider bg-accent-quiet text-accent border border-accent/40 shrink-0">
            Most popular
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-8">
        <span className="text-4xl sm:text-5xl font-semibold font-mono text-white">
          {price}
        </span>
        {period && (
          <span className="text-sm font-mono text-foreground/50">{period}</span>
        )}
      </div>

      <ul className="space-y-4 mb-10 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
            <Check className="w-5 h-5 text-accent shrink-0" strokeWidth={1.5} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/sign-up"
        className={`w-full py-3.5 px-6 text-center text-sm font-semibold transition-colors block ${
          featured
            ? "bg-white text-black hover:bg-zinc-200"
            : "bg-surface text-white border border-border hover:bg-surface-hover hover:border-border-strong"
        }`}
      >
        {featured ? "Get started with Pro" : "Contact sales"}
      </Link>
    </div>
  );
}

export default PriceTier;

