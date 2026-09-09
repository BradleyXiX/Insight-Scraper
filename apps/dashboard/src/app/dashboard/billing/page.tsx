"use client";

import { useState } from "react";
import { Check, CreditCard, Zap, AlertTriangle, ShieldCheck, Building2 } from "lucide-react";
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto py-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 text-center items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20 text-sm font-medium mb-2">
          <SparklesIcon className="w-4 h-4" />
          Unlock the full potential
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-zinc-400 pb-2">
          Plans & Billing
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl">
          Scale your business with high-speed extractions. Manage your subscription and organization settings seamlessly.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-4 rounded-2xl flex items-center gap-3 backdrop-blur-sm shadow-xl shadow-red-500/5 animate-in slide-in-from-top-4">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {!orgId && !error && (
         <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-5 py-4 rounded-2xl flex items-center gap-4 backdrop-blur-sm shadow-xl shadow-amber-500/5">
         <Building2 className="w-6 h-6 shrink-0" />
         <div>
           <h4 className="font-bold">Organization Required</h4>
           <p className="text-sm opacity-90">Please select or create an Organization using the switcher in the top right before subscribing to a plan.</p>
         </div>
       </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid lg:grid-cols-2 gap-8 items-stretch pt-4">
        {/* Pro Plan */}
        <div className="relative group rounded-3xl p-px bg-gradient-to-b from-indigo-500 to-violet-600 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_-10px_rgba(79,70,229,0.5)] transition-all duration-500 hover:-translate-y-1">
          <div className="absolute top-0 right-8 -translate-y-1/2">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              Most Popular
            </div>
          </div>
          
          <div className="relative h-full bg-zinc-950 rounded-[calc(1.5rem-1px)] p-8 sm:p-10 flex flex-col overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center ring-1 ring-indigo-500/30">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Pro Extract</h3>
                <p className="text-sm text-zinc-400">Everything you need to scale</p>
              </div>
            </div>
            
            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-white">$49</span>
              <span className="text-lg text-zinc-400 font-medium">/month</span>
            </div>
            
            <ul className="space-y-4 mb-10 flex-1">
              {[
                "Unlimited B2B Searches", 
                "High-speed Concurrency (10x)", 
                "Export to CSV & JSON", 
                "Priority 24/7 Support", 
                "Automated Data Enrichment"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-300">
                  <div className="mt-1 rounded-full bg-indigo-500/20 p-1 ring-1 ring-indigo-500/30">
                    <Check className="w-3 h-3 text-indigo-400 shrink-0" />
                  </div>
                  <span className="font-medium text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={handleSubscribe}
              disabled={isLoading || !orgId}
              className="relative w-full py-4 rounded-xl bg-white text-zinc-950 font-bold text-lg hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 via-white to-indigo-100 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity" />
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  "Redirecting to Stripe..."
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Subscribe Now
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Enterprise Plan */}
        <div className="rounded-3xl p-px bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-500">
          <div className="relative h-full bg-zinc-950/80 backdrop-blur-xl rounded-[calc(1.5rem-1px)] p-8 sm:p-10 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center ring-1 ring-zinc-700">
                <ShieldCheck className="w-6 h-6 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Enterprise</h3>
                <p className="text-sm text-zinc-400">Custom tailored solutions</p>
              </div>
            </div>
            
            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-white">Custom</span>
            </div>
            
            <ul className="space-y-4 mb-10 flex-1">
              {[
                "Dedicated Server Infrastructure", 
                "Bypass Rate Limits", 
                "Custom Data Formatting", 
                "Dedicated Account Manager", 
                "99.9% Uptime SLA Guarantee"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-400">
                  <div className="mt-1 rounded-full bg-zinc-800 p-1 ring-1 ring-zinc-700">
                    <Check className="w-3 h-3 text-zinc-500 shrink-0" />
                  </div>
                  <span className="font-medium text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className="w-full py-4 rounded-xl bg-transparent text-white font-bold text-lg border-2 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer Features */}
      <div className="grid grid-cols-3 gap-6 pt-12 border-t border-white/5 mt-12 text-center text-sm text-zinc-500">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
             <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <span className="font-medium text-zinc-300">Secure Payments</span>
          <span>Powered by Stripe</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
          <span className="font-medium text-zinc-300">Cancel Anytime</span>
          <span>No hidden fees</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="font-medium text-zinc-300">Instant Access</span>
          <span>Start immediately</span>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11.64 5.25a.75.75 0 0 0-1.28 0l-1.58 3.55a.75.75 0 0 1-.41.41l-3.55 1.58a.75.75 0 0 0 0 1.28l3.55 1.58a.75.75 0 0 1 .41.41l1.58 3.55a.75.75 0 0 0 1.28 0l1.58-3.55a.75.75 0 0 1 .41-.41l3.55-1.58a.75.75 0 0 0 0-1.28l-3.55-1.58a.75.75 0 0 1-.41-.41l-1.58-3.55Z" />
    </svg>
  );
}
