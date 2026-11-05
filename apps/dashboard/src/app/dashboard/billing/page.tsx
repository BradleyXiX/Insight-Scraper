"use client";

import { useState } from "react";
import { AlertTriangle, Building2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { PriceTier } from "@/components/PriceTier";

const PRO_FEATURES = [
  "Unlimited B2B searches",
  "High speed concurrency (10x)",
  "Export to CSV and JSON",
  "Priority 24/7 support",
  "Automated data enrichment",
];

const ENTERPRISE_FEATURES = [
  "Dedicated server infrastructure",
  "Bypass rate limits",
  "Custom data formatting",
  "Dedicated account manager",
  "99.9% uptime SLA guarantee",
];

export default function BillingPage() {
  const { orgId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You must create or select an organization before subscribing.");
        }
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url; // Redirect to Stripe Checkout
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Plans and billing
        </h1>
        <p className="text-foreground/70">
          Scale your business with high speed extractions. Manage your subscription and organization settings seamlessly.
        </p>
      </div>

      {error && (
        <div className="panel p-4 bg-danger-quiet border border-danger/40 text-danger flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!orgId && !error && (
        <div className="panel p-4 bg-attention-quiet border border-attention/30 text-attention flex items-center gap-3">
          <Building2 className="w-5 h-5 shrink-0" strokeWidth={1.5} />
          <div>
            <h4 className="font-semibold text-sm">Organization required</h4>
            <p className="text-xs opacity-90">Please select or create an organization using the switcher in the top right before subscribing to a plan.</p>
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid lg:grid-cols-2 gap-8 items-stretch pt-2">
        <PriceTier
          name="Pro"
          price="$49"
          period="/month"
          description="Everything you need to extract and enrich leads"
          features={PRO_FEATURES}
          featured={true}
          ctaText={isLoading ? "Redirecting to Stripe..." : "Subscribe now"}
          onAction={handleSubscribe}
          actionDisabled={isLoading || !orgId}
        />

        <PriceTier
          name="Enterprise"
          price="Custom"
          description="Custom tailored solutions for larger agencies"
          features={ENTERPRISE_FEATURES}
          featured={false}
          ctaText="Contact sales"
          ctaHref="mailto:sales@insightscraper.com"
        />
      </div>

      {/* Footer Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-border text-center text-xs text-foreground/60">
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-medium text-white">Secure payments</span>
          <span>Processed by Stripe</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-medium text-white">Cancel anytime</span>
          <span>No hidden fees</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-medium text-white">Instant access</span>
          <span>Account activated immediately</span>
        </div>
      </div>
    </div>
  );
}
