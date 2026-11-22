import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Lock, Play, Search } from "lucide-react";
import { Logo } from "@/components/Logo";
import { KpiStrip } from "@/components/KpiStrip";
import { LeadResults } from "@/components/LeadResults";
import { DemoExport } from "@/components/DemoExport";
import { CONTACT_CHANNELS, OPERATOR_CONTACT } from "@/lib/contact";
import { DEMO_PROVENANCE, DEMO_RUN } from "@/lib/demo-run";

export const metadata: Metadata = {
  title: "Sample output — Insight Scraper",
  description:
    "A real extraction run: ten local businesses, their mobile load time, available chat widget, and the pitch written for each one.",
};

const LIMIT_OPTIONS = [10, 25, 50];

/** Only the captured run's market is shown, so the label stays local to this page. */
const REGION_LABEL = "Kenya";

export default function DemoPage(): React.ReactElement {

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <span className="hidden sm:inline px-2 py-0.5 text-xs font-mono uppercase tracking-wider bg-accent-quiet text-accent border border-accent/40">
              Sample output
            </span>
          </div>
          <nav className="flex items-center gap-5 text-sm" aria-label="Sample navigation">
            <Link href="/" className="text-foreground/70 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/sign-in" className="text-foreground/70 hover:text-white transition-colors">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="panel p-4 bg-surface border border-border flex flex-col gap-1">
          <p className="text-sm text-foreground/80">{DEMO_PROVENANCE}</p>
          <p className="text-xs font-mono text-foreground/60">
            {DEMO_RUN.query} · {REGION_LABEL} · {DEMO_RUN.source_label} · {DEMO_RUN.limit} leads
          </p>
        </div>

        <div className="space-y-2">
          <h1 className="heading-4 text-foreground">International lead and signal scraper</h1>
          <p className="text-foreground/70 max-w-3xl">
            This is the dashboard, read-only, loaded with a single real run. Each row is a
            business the extractor found, the mobile load time it measured, whether the site
            has a chat widget, and the pitch it wrote.
          </p>
        </div>

        <div className="panel p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3" aria-hidden="true">
            <div className="relative w-full md:w-36">
              <select
                disabled
                defaultValue={DEMO_RUN.region}
                aria-label="Target region (disabled)"
                className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-foreground/60 font-mono text-sm appearance-none cursor-not-allowed"
              >
                <option value={DEMO_RUN.region}>{REGION_LABEL}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/40">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="relative w-full md:w-52">
              <select
                disabled
                defaultValue={DEMO_RUN.source}
                aria-label="Scraping source (disabled)"
                className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-foreground/60 font-mono text-sm appearance-none cursor-not-allowed"
              >
                <option value={DEMO_RUN.source}>{DEMO_RUN.source_label}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/40">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="relative w-full md:w-32">
              <select
                disabled
                defaultValue={DEMO_RUN.limit}
                aria-label="Lead limit (disabled)"
                className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-foreground/60 font-mono text-sm appearance-none cursor-not-allowed"
              >
                {LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} leads
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/40">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
              <input
                type="text"
                readOnly
                value={DEMO_RUN.query}
                aria-label="Sample query (read-only)"
                className="w-full bg-surface border border-border rounded-none py-3 pl-12 pr-4 text-foreground/60 font-mono cursor-not-allowed"
              />
            </div>

            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 bg-surface-hover text-foreground/60 border border-border px-7 py-3 rounded-none font-semibold text-sm whitespace-nowrap w-full md:w-48 cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Start extraction
            </button>
          </div>

          <div className="flex items-start gap-3 text-sm text-foreground/70">
            <Lock className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
            <p>
              Extraction runs on the operator&apos;s machine today, so this page is a read-only
              sample. Public accounts are not open yet. What you see below is exactly what a run
              produces: same components, same fields, same export.
            </p>
          </div>
        </div>

        <KpiStrip leads={DEMO_RUN.leads} />

        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="heading-6 text-foreground">Extracted leads</h2>
            <span className="px-2 py-0.5 text-xs font-mono bg-surface border border-border text-foreground/70">
              {DEMO_RUN.leads.length} shown
            </span>
            <span className="text-xs font-mono text-foreground/60">
              {DEMO_RUN.query} · {DEMO_RUN.region} · {DEMO_RUN.source}
            </span>
          </div>

          <LeadResults leads={DEMO_RUN.leads} region={DEMO_RUN.region} />
          <DemoExport
            leads={DEMO_RUN.leads}
            region={DEMO_RUN.region}
            query={DEMO_RUN.query}
          />
        </div>

        <div className="border-t border-border pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-foreground/70">
              Want a run like this for your market? Email{" "}
              <a
                href={OPERATOR_CONTACT.mailto}
                className="text-accent hover:underline font-mono"
              >
                {OPERATOR_CONTACT.email}
              </a>
              .
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              {CONTACT_CHANNELS.filter((channel) => channel.external).map((channel) => (
                <a
                  key={channel.id}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/60 hover:text-white transition-colors"
                >
                  {channel.label}
                </a>
              ))}
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-mono uppercase tracking-wider text-foreground/60 hover:text-white transition-colors shrink-0"
          >
            Back to the overview
          </Link>
        </div>
      </main>
    </div>
  );
}
