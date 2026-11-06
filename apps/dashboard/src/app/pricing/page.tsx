import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PriceTier } from "@/components/PriceTier";
import { SiteFooter } from "@/components/SiteFooter";

const PRO_FEATURES = [
  "Up to 50 leads per search",
  "Mobile load time and chatbot detection",
  "Contact and social signal extraction",
  "CSV export",
  "Email support",
];

const ENTERPRISE_FEATURES = [
  "Custom lead volume",
  "Custom source integrations",
  "Custom data formatting",
  "Onboarding and setup help",
  "Priority email support",
];

export default function PricingPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative flex flex-col selection:bg-accent-quiet">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto border-b border-border bg-surface/80 backdrop-blur-md">
        <Logo size={24} />
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-sm font-medium text-white transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-foreground/70 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-semibold bg-white text-black px-4 py-2 hover:bg-zinc-200 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Main Pricing Content */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-16 pb-24 flex-1">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-border text-accent text-xs font-mono uppercase tracking-wider mb-6">
            <span>PRICING</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white mb-6 leading-tight">
            Transparent pricing for sales teams
          </h1>

          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed max-w-2xl mx-auto">
            Choose the plan that fits your prospecting scale. Every subscription includes full signal inspection and direct export tools.
          </p>
        </div>

        {/* Pricing Cards Grid (Two tiers only) */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch mb-16">
          <PriceTier
            name="Pro"
            price="$49"
            period="/month"
            description="For solo operators running targeted prospect lists"
            features={PRO_FEATURES}
            featured={true}
          />

          <PriceTier
            name="Enterprise"
            price="Custom"
            description="For agencies that need custom volume and formatting"
            features={ENTERPRISE_FEATURES}
            featured={false}
          />
        </div>

        {/* Reassurance notes */}
        <div className="max-w-2xl mx-auto text-center border-t border-border pt-12">
          <p className="text-xs font-mono text-foreground/50">
            Free to sign up. Contact support to change or cancel a subscription.
          </p>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}

