import React from "react";
import Link from "next/link";
import { ArrowRight, Gauge, MessageSquare, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ExtractionDemo } from "@/components/ExtractionDemo";
import { TaglineReveal } from "@/components/TaglineReveal";
import { FaqList } from "@/components/FaqList";
import { SiteFooter } from "@/components/SiteFooter";

const FAQ_ITEMS = [
  {
    q: "Which directory sources does Insight Scraper pull from?",
    a: "The engine pulls verified local business listings from Google Maps, DuckDuckGo and Yellow Pages across six international regions.",
  },
  {
    q: "How does the mobile speed inspection work?",
    a: "Each business website is loaded through a headless browser that records mobile load duration in milliseconds. Sites loading slower than 3000 milliseconds trigger an automated speed overhaul pitch.",
  },
  {
    q: "How does chatbot detection determine the pitch?",
    a: "If a business has a fast website but no interactive chatbot widget, we qualify them for a dedicated customer retrieval bot to increase conversion.",
  },
  {
    q: "Which geographic markets are supported?",
    a: "We support directory searches and signal extraction across the United States, United Kingdom, Australia, Canada, United Arab Emirates, and Kenya.",
  },
  {
    q: "Can I export the extracted leads?",
    a: "Yes. Every search produces clean structured data that you can download as a comma separated values spreadsheet for your CRM or outreach system.",
  },
  {
    q: "What does the Pro subscription cost?",
    a: "The Pro tier costs $49 per month and includes up to 50 leads per search, full signal extraction and CSV export. Contact support to change or cancel your plan.",
  },
];

export default function Home(): React.ReactElement {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative flex flex-col selection:bg-accent-quiet">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto border-b border-border bg-surface/80 backdrop-blur-md">
        <Logo size={24} />
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-sm font-medium text-foreground/70 hover:text-white transition-colors"
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

      {/* Hero Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-10 sm:pt-20 pb-16 flex flex-col">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-border text-accent text-xs font-mono uppercase tracking-wider mb-6">
            <span>B2B LEAD ENRICHMENT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-gradient-hero mb-6 leading-tight">
            Every lead on the page, with the pitch already written.
          </h1>

          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed mb-8 max-w-2xl">
            Pull local businesses from Google Maps, DuckDuckGo and Yellow Pages across six markets. We check their mobile speed and chatbot, then tell you which service to sell them.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
            >
              <span>Run a sample extraction</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center text-sm font-medium text-foreground/70 hover:text-white underline underline-offset-4 transition-colors"
            >
              See pricing
            </Link>
          </div>

          <p className="text-xs font-mono text-foreground/50">
            Free to sign up. Cancel anytime.
          </p>
        </div>

        {/* Proof slot */}
        <div className="py-6 my-8 border-y border-border text-center">
          <span className="text-xs font-mono text-foreground/30 uppercase tracking-widest">
            {"{{testimonial}}"}
          </span>
        </div>

        {/* Hero Visual: Extraction Demo over dot-grid */}
        <div className="w-full dot-grid p-3 sm:p-6 lg:p-8 border border-border bg-surface/30">
          <ExtractionDemo variant="hero" />
        </div>
      </section>

      {/* Tagline Reveal */}
      <section className="w-full border-t border-border bg-background">
        <TaglineReveal
          lines={[
            "Every business has a blind spot on mobile devices.",
            "Insight Scraper finds the gap and prepares the sales pitch for you.",
          ]}
        />
      </section>

      {/* How it works */}
      <section className="w-full border-t border-border bg-surface py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-mono uppercase tracking-wider text-accent mb-2">
              WORKFLOW
            </div>
            <h2 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight">
              How the extraction engine operates
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="panel p-6 bg-background border border-border">
              <div className="w-8 h-8 flex items-center justify-center bg-surface border border-border text-accent font-mono text-xs font-semibold mb-6">
                01
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Select target market and directory source
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Choose between Google Maps, DuckDuckGo, or Yellow Pages across six supported territories.
              </p>
            </div>

            <div className="panel p-6 bg-background border border-border">
              <div className="w-8 h-8 flex items-center justify-center bg-surface border border-border text-accent font-mono text-xs font-semibold mb-6">
                02
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Automated speed and widget inspection
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Our engine inspects each business website on a mobile viewport, measuring load duration in milliseconds and detecting chat software.
              </p>
            </div>

            <div className="panel p-6 bg-background border border-border">
              <div className="w-8 h-8 flex items-center justify-center bg-surface border border-border text-accent font-mono text-xs font-semibold mb-6">
                03
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Ready to send pitch recommendations
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Every result receives a calculated pitch hook based on real technical data, ready for instant export.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits (Two-column zig zag, not three equal cards) */}
      <section className="w-full border-t border-border bg-background py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="max-w-2xl">
            <div className="text-xs font-mono uppercase tracking-wider text-accent mb-2">
              OUTCOMES
            </div>
            <h2 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight">
              Built for sales outreach and consulting agencies
            </h2>
          </div>

          {/* Zig zag row 1: Text Left, Visual Right */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                Stop pitching generic services without proof
              </h3>
              <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                Cold prospects ignore generic messages. Insight Scraper gives you concrete data points about mobile slowness and missing conversion tools before you send your proposal.
              </p>
            </div>
            <div className="panel p-6 bg-surface border border-border">
              <div className="text-xs uppercase font-mono text-foreground/40 mb-2">
                Detected signal
              </div>
              <div className="text-xl font-semibold font-mono text-attention mb-1">
                4,317 ms mobile load time
              </div>
              <div className="text-xs text-foreground/60 mb-4 font-mono">
                Benchmark threshold exceeded by 1,317 ms
              </div>
              <div className="text-xs uppercase font-mono text-foreground/40 mb-2">
                Prescribed pitch
              </div>
              <div className="px-3 py-1.5 bg-attention-quiet text-attention border border-attention/30 text-xs font-medium inline-block">
                Pitch $750 Speed Overhaul (#2)
              </div>
            </div>
          </div>

          {/* Zig zag row 2: Visual Left, Text Right (Zig zag flip) */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="panel p-6 bg-surface border border-border order-2 md:order-1">
              <div className="text-xs uppercase font-mono text-foreground/40 mb-3">
                Covered territories
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs text-center">
                <div className="p-3 bg-background border border-border text-foreground">US</div>
                <div className="p-3 bg-background border border-border text-foreground">UK</div>
                <div className="p-3 bg-background border border-border text-foreground">CA</div>
                <div className="p-3 bg-background border border-border text-foreground">AU</div>
                <div className="p-3 bg-background border border-border text-foreground">AE</div>
                <div className="p-3 bg-background border border-border text-foreground">KE</div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                Target six international territories in seconds
              </h3>
              <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                Prospect beyond your immediate market. Search directory records in the United States, United Kingdom, Canada, Australia, United Arab Emirates, and Kenya from a single workspace.
              </p>
            </div>
          </div>

          {/* Zig zag row 3: Text Left, Visual Right */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
                Direct spreadsheet export ready for your CRM
              </h3>
              <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                Download complete comma separated files containing phone numbers, domains, load speeds, and customized pitch hooks formatted for instant upload into outreach sequences.
              </p>
            </div>
            <div className="panel p-6 bg-surface border border-border font-mono text-xs">
              <div className="text-xs uppercase text-foreground/40 mb-3">
                Export schema preview
              </div>
              <div className="text-foreground/70 space-y-1 bg-background p-3 border border-border">
                <div>&quot;Business Name&quot;,&quot;Phone&quot;,&quot;Website&quot;</div>
                <div>&quot;Mobile Load Time&quot;,&quot;Chatbot&quot;,&quot;Pitch&quot;</div>
              </div>
              <div className="mt-4 text-xs text-accent uppercase font-sans font-medium">
                Standard comma separated values
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signals section */}
      <section className="w-full border-t border-border bg-surface py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-mono uppercase tracking-wider text-accent mb-2">
              SIGNALS
            </div>
            <h2 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight mb-4">
              The signal logic behind every recommendation
            </h2>
            <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
              We inspect two critical conversion metrics on every business website to determine the right proposal angle.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="panel p-6 bg-background border border-border">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="w-5 h-5 text-attention" strokeWidth={1.5} />
                <h3 className="text-base font-semibold text-white">
                  Mobile load above 3000 ms
                </h3>
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed mb-6">
                Websites taking longer than 3000 milliseconds to render on mobile devices lose visitors. The engine assigns the speed overhaul proposal.
              </p>
              <div className="px-2.5 py-1 bg-attention-quiet text-attention border border-attention/30 text-xs font-medium inline-block">
                Pitch $750 Speed Overhaul (#2)
              </div>
            </div>

            <div className="panel p-6 bg-background border border-border">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-accent" strokeWidth={1.5} />
                <h3 className="text-base font-semibold text-white">
                  Fast site without chatbot
                </h3>
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed mb-6">
                Websites with fast mobile loading that lack an automated interactive widget qualify for an inquiry capture assistant.
              </p>
              <div className="px-2.5 py-1 bg-accent-quiet text-accent border border-accent/30 text-xs font-medium inline-block">
                Pitch $1,000 RAG Bot (#4)
              </div>
            </div>

            <div className="panel p-6 bg-background border border-border">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-foreground/70" strokeWidth={1.5} />
                <h3 className="text-base font-semibold text-white">
                  Fast site with active chatbot
                </h3>
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed mb-6">
                Websites meeting both technical criteria represent modern companies qualified for custom automation projects.
              </p>
              <div className="px-2.5 py-1 bg-surface-hover text-foreground/70 border border-border text-xs font-medium inline-block">
                Qualified Enterprise AI Lead
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full border-t border-border bg-background py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="text-xs font-mono uppercase tracking-wider text-accent mb-2">
              QUESTIONS
            </div>
            <h2 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight">
              Frequently asked questions
            </h2>
          </div>

          <FaqList items={FAQ_ITEMS} />
        </div>
      </section>

      {/* Final CTA (Identical to Hero) */}
      <section className="w-full border-t border-border bg-surface py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-border text-accent text-xs font-mono uppercase tracking-wider mb-6">
            <span>GET STARTED</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white mb-6 leading-tight">
            Every lead on the page, with the pitch already written.
          </h2>

          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed mb-8 max-w-2xl mx-auto">
            Pull local businesses from Google Maps, DuckDuckGo and Yellow Pages across six markets. We check their mobile speed and chatbot, then tell you which service to sell them.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors w-full sm:w-auto"
            >
              <span>Run a sample extraction</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center text-sm font-medium text-foreground/70 hover:text-white underline underline-offset-4 transition-colors"
            >
              See pricing
            </Link>
          </div>

          <p className="text-xs font-mono text-foreground/50">
            Free to sign up. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
