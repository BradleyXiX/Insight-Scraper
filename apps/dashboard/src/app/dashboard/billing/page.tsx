"use client";

import { useState } from "react";
import { Check, CreditCard, Zap, AlertTriangle } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

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
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-zinc-400">Manage your workspace subscription and billing details.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!orgId && (
         <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-xl flex items-center gap-3">
         <AlertTriangle className="w-5 h-5 shrink-0" />
         <p>You must select or create an Organization using the switcher in the top right before subscribing.</p>
       </div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 mt-8">
        {/* Pro Plan */}
        <div className="relative bg-zinc-900/50 border border-indigo-500/30 rounded-2xl p-8 backdrop-blur-sm shadow-[0_0_30px_-10px_rgba(79,70,229,0.2)]">
          <div className="absolute top-0 right-0 bg-indigo-600 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
            Most Popular
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold">Pro Extract</h3>
          </div>
          
          <div className="mb-6">
            <span className="text-4xl font-extrabold">$49</span>
            <span className="text-zinc-400">/month</span>
          </div>
          
          <ul className="space-y-3 mb-8">
            {["Unlimited B2B Searches", "High-speed Concurrency", "CSV Data Export", "Priority Support", "Automated Enrichment"].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-zinc-300">
                <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          
          <button 
            onClick={handleSubscribe}
            disabled={isLoading || !orgId}
            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? "Redirecting..." : (
              <>
                <CreditCard className="w-5 h-5" />
                Subscribe with Stripe
              </>
            )}
          </button>
        </div>

        {/* Enterprise Plan (Contact) */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-2xl font-bold">Enterprise</h3>
          </div>
          
          <div className="mb-6">
            <span className="text-4xl font-extrabold">Custom</span>
          </div>
          
          <ul className="space-y-3 mb-8">
            {["Dedicated Infrastructure", "Higher Concurrency Limits", "Custom Data Formats", "Account Manager", "SLA Guarantee"].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-zinc-400">
                <Check className="w-5 h-5 text-zinc-600 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          
          <button className="w-full py-4 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-all border border-zinc-700">
            Contact Sales
          </button>
        </div>
      </div>
      
      {/* Footer Note */}
      <p className="text-center text-sm text-zinc-500 mt-8">
        Payments are securely processed by Stripe. You can cancel your subscription at any time.
      </p>
    </div>
  );
}
