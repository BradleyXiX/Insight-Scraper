"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Download, AlertCircle, Play, ChevronDown } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { getApiUrl } from "@/lib/api";
import { LeadItem, toCsv } from "@/lib/leads";
import { KpiStrip } from "@/components/KpiStrip";
import { ScrapeStatus, ScrapeState } from "@/components/ScrapeStatus";
import { LeadResults } from "@/components/LeadResults";

const REGION_OPTIONS = [
  { value: "US", label: "🇺🇸 USA" },
  { value: "GB", label: "🇬🇧 UK" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "CA", label: "🇨🇦 Canada" },
  { value: "AE", label: "🇦🇪 UAE" },
  { value: "KE", label: "🇰🇪 Kenya" },
];

const SOURCE_OPTIONS = [
  { value: "gmaps", label: "📍 Google Maps" },
  { value: "duckduckgo-places", label: "🦆 DuckDuckGo Places" },
  { value: "yellowpages-intl", label: "📖 YellowPages Intl" },
];

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("US");
  const [source, setSource] = useState("gmaps");
  const [scrapeState, setScrapeState] = useState<ScrapeState>({ phase: "idle" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const apiUrl = getApiUrl();

  // Fetch initial leads on load
  const fetchExistingLeads = useCallback(async () => {
    setLoadError(null);
    try {
      let token = null;
      try {
        token = await getToken();
      } catch {
        // Dev bypass mode when Clerk is unauthenticated
      }
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        headers["Authorization"] = "Bearer dev_bypass_token";
      }

      const res = await fetch(`${apiUrl}/api/leads`, { headers });
      if (!res.ok) {
        throw new Error("Failed to load initial leads");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch {
      setLoadError("Could not reach the extraction service. Check that the backend is running, then try again.");
    }
  }, [apiUrl, getToken]);

  useEffect(() => {
    fetchExistingLeads();
  }, [fetchExistingLeads]);

  const handleExportCSV = () => {
    if (!leads || leads.length === 0) return;

    const csvContent = toCsv(leads, { region, query });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `b2b_leads_${region.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCancelScrape = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setScrapeState({ phase: "idle" });
  };

  const handleScrape = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    if (scrapeState.phase === "running") return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setScrapeState({ phase: "running", startedAt: Date.now() });

    try {
      let token = null;
      try {
        token = await getToken();
      } catch {
        // Dev bypass mode
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        headers["Authorization"] = "Bearer dev_bypass_token";
      }

      const scrapeParams = new URLSearchParams({
        query: query.trim(),
        region: region,
        source: source,
        limit: "25",
      });

      const res = await fetch(`${apiUrl}/api/scrape?${scrapeParams.toString()}`, {
        method: "POST",
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 402) {
          setScrapeState({
            phase: "error",
            message: "Your subscription is not active. Open Billing to choose a plan.",
          });
          return;
        }
        if (res.status === 403) {
          setScrapeState({
            phase: "error",
            message: "You do not have access to this workspace.",
          });
          return;
        }
        if (res.status >= 500) {
          setScrapeState({
            phase: "error",
            message: "Could not reach the extraction service. Check that the backend is running, then try again.",
          });
          return;
        }
        setScrapeState({
          phase: "error",
          message: "Extraction failed. Try a different query or region.",
        });
        return;
      }

      const data = await res.json();
      let newLeads: LeadItem[] = [];
      if (data && Array.isArray(data.leads)) {
        newLeads = data.leads;
      }

      // Fetch the updated list of leads from the database
      try {
        const leadsRes = await fetch(`${apiUrl}/api/leads`, {
          headers,
          signal: controller.signal,
        });
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          if (Array.isArray(leadsData) && leadsData.length > 0) {
            newLeads = leadsData;
          }
        }
      } catch {
        // Keep leads from scrape response
      }

      setLeads(newLeads);

      if (newLeads.length > 0) {
        setScrapeState({ phase: "done", count: newLeads.length });
      } else {
        setScrapeState({ phase: "empty" });
      }
    } catch {
      if (controller.signal.aborted) {
        return;
      }
      setScrapeState({
        phase: "error",
        message: "Could not reach the extraction service. Check that the backend is running, then try again.",
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const isRunning = scrapeState.phase === "running";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="heading-4 text-foreground">International lead and signal scraper</h1>
          <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-accent-quiet text-accent border border-accent/40 uppercase">
            Global Multi Source
          </span>
        </div>
        <p className="text-foreground/70">
          Target niche and location across US, UK, Australia, Canada, UAE, and Kenya. Inspects mobile performance, chatbot adoption, and client pitch signals.
        </p>
      </div>

      {/* Initial Load Error Panel */}
      {loadError && (
        <div className="panel p-4 bg-surface border border-danger/40 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-danger inline-block" aria-hidden="true" />
            <p className="text-danger font-mono text-xs">
              {loadError}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchExistingLeads}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1 bg-surface border border-border text-white hover:border-foreground/50 cursor-pointer transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="panel p-6 space-y-4">
        <form onSubmit={handleScrape} className="flex flex-col md:flex-row gap-3">
          {/* Target Region Dropdown */}
          <div className="relative w-full md:w-40">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
              aria-label="Target Region"
            >
              {REGION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Source Dropdown */}
          <div className="relative w-full md:w-48">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
              aria-label="Scraping Source"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. medspas in Austin TX, dentists in London, cafes in Sydney" 
              className="w-full bg-surface border border-border rounded-none py-3 pl-12 pr-4 text-white placeholder:text-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              type="submit"
              disabled={isRunning || !query.trim()}
              className="flex items-center justify-center gap-2 bg-white text-black px-7 py-3 rounded-none font-semibold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap w-full md:w-44"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent motion-safe:animate-pulse inline-block" />
                  Extracting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Extraction
                </span>
              )}
            </button>

            {/* Export CSV Button in Action Bar */}
            <button 
              type="button"
              onClick={handleExportCSV}
              disabled={leads.length === 0}
              className="flex items-center justify-center gap-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 px-5 py-3 rounded-none font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors uppercase tracking-wider text-sm whitespace-nowrap"
              title="Export all scraped leads to CSV"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </form>

        {/* ScrapeStatus Mount */}
        <ScrapeStatus
          state={scrapeState}
          onCancel={handleCancelScrape}
          onRetry={() => handleScrape()}
        />
        
        {/* Helper Note */}
        <div className="flex items-center gap-2 text-sm text-foreground/50">
          <AlertCircle className="w-4 h-4 text-accent" />
          <p>
            Supports US, UK, Australia, Canada, UAE, and Kenya. Playwright rotates stealth profiles, audits mobile PageSpeed signals, and detects Intercom, Drift, Tidio, & Botpress widgets.
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <KpiStrip leads={leads} />

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="heading-6 text-foreground">Extracted leads</h2>
            <span className="px-2 py-0.5 text-xs font-mono bg-surface border border-border text-foreground/70">
              {leads.length} found
            </span>
          </div>
          <button 
            type="button"
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        
        <LeadResults leads={leads} region={region} />
      </div>
    </div>
  );
}
