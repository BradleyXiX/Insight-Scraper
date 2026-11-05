"use client";

import { useState, useEffect } from "react";
import { Search, Download, AlertCircle, Play, Globe, Bot, Zap, CheckCircle, ExternalLink, ChevronDown } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { getApiUrl } from "@/lib/api";
import { LeadItem, getPitchHook, getMobileLoadMs, getHasChatbot } from "@/lib/leads";


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
  const { getToken, orgId } = useAuth();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("US");
  const [source, setSource] = useState("gmaps");
  const [isScraping, setIsScraping] = useState(false);
  
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const apiUrl = getApiUrl();




  // Fetch initial leads on load
  useEffect(() => {
    const fetchExistingLeads = async () => {
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
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setLeads(data);
          }
        }
      } catch (err) {
        console.warn("Could not load initial leads:", err);
      }
    };

    fetchExistingLeads();
  }, [apiUrl, getToken]);

  const handleExportCSV = () => {
    if (!leads || leads.length === 0) {
      alert("No leads available to export.");
      return;
    }

    const headers = [
      "Business Name",
      "Phone",
      "Website",
      "Email",
      "Socials",
      "Region",
      "Has_Chatbot_Widget",
      "Mobile_Load_Ms",
      "Pitch_Hook",
      "Contact Details",
      "Search Query",
      "Extracted At"
    ];

    const rows = leads.map((lead) => {
      const name = lead.business_name || lead["Business Name"] || lead.name || "Unknown Business";
      const phone = lead.phone || lead["Phone"] || lead.contact || lead["Contact"] || "Hidden";
      const website = lead.website || lead["Website"] || "";
      const email = lead.email || lead["Email"] || "";
      const socials = lead.socials || lead["Socials"] || "";
      const reg = lead.region || lead["Region"] || region;
      const hasChatbot = getHasChatbot(lead);
      const mobileLoadMs = getMobileLoadMs(lead);
      const pitchHook = getPitchHook(lead);
      const contact = lead.contact || lead["Contact"] || phone;
      const searchQuery = lead.query || lead.search_query || lead["Search Query"] || query;
      const createdAt = lead.created_at || new Date().toISOString();

      return [
        name,
        phone,
        website,
        email,
        socials,
        reg,
        hasChatbot ? "TRUE" : "FALSE",
        mobileLoadMs,
        pitchHook,
        contact,
        searchQuery,
        createdAt
      ]
        .map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
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

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsScraping(true);
    
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
        limit: "25"
      });

      const res = await fetch(`${apiUrl}/api/scrape?${scrapeParams.toString()}`, {
        method: "POST",
        headers
      });
      
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      
      const data = await res.json();

      // If backend returned leads array directly in data.leads, update immediately
      if (data && Array.isArray(data.leads) && data.leads.length > 0) {
        setLeads(data.leads);
      }
      
      // Fetch the updated list of leads from the database
      const leadsRes = await fetch(`${apiUrl}/api/leads`, { headers });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        if (Array.isArray(leadsData) && leadsData.length > 0) {
          setLeads(leadsData);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to scrape leads: " + error);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-display text-white">International Lead & Signal Scraper</h1>
          <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-primary-500/20 text-primary-400 border border-primary-500/40 uppercase">
            Global Multi-Source
          </span>
        </div>
        <p className="text-foreground/70">
          Target niche and location across US, UK, Australia, Canada, UAE, and Kenya. Inspects mobile performance, chatbot adoption, and client pitch signals.
        </p>
      </div>

      {/* Action Bar */}
      <div className="panel p-6">
        <form onSubmit={handleScrape} className="flex flex-col md:flex-row gap-3">
          {/* Target Region Dropdown */}
          <div className="relative min-w-[160px]">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-primary-500 font-mono text-sm cursor-pointer appearance-none"
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
          <div className="relative min-w-[190px]">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-primary-500 font-mono text-sm cursor-pointer appearance-none"
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
              className="w-full bg-surface border border-border rounded-none py-3 pl-12 pr-4 text-white placeholder:text-foreground/40 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              type="submit"
              disabled={isScraping || !query.trim()}
              className="flex items-center justify-center gap-2 bg-primary-600 text-white px-7 py-3 rounded-none font-medium hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow uppercase tracking-wider text-sm whitespace-nowrap min-w-[170px]"
            >
              {isScraping ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Extracting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Extraction
                </span>
              )}
            </button>

            {/* Line 97 Export CSV Button in Action Bar */}
            <button 
              type="button"
              onClick={handleExportCSV}
              disabled={leads.length === 0}
              className="flex items-center justify-center gap-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 px-5 py-3 rounded-none font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-wider text-sm whitespace-nowrap"
              title="Export all scraped leads to CSV"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </form>
        
        {/* Helper Note */}
        <div className="flex items-center gap-2 mt-4 text-sm text-foreground/50">
          <AlertCircle className="w-4 h-4 text-primary-400" />
          <p>
            Supports US, UK, Australia, Canada, UAE, and Kenya. Playwright rotates stealth profiles, audits mobile PageSpeed signals, and detects Intercom, Drift, Tidio, & Botpress widgets.
          </p>
        </div>
      </div>

      {/* Results Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-display text-white">Extracted Leads</h2>
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
        
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-foreground/50 uppercase bg-surface border-b border-border">
              <tr>
                <th className="px-5 py-4 font-medium">Business Name</th>
                <th className="px-5 py-4 font-medium">Contact & Phone</th>
                <th className="px-5 py-4 font-medium">Website</th>
                <th className="px-4 py-4 font-medium text-center">Mobile Load</th>
                <th className="px-4 py-4 font-medium text-center">Chatbot</th>
                <th className="px-5 py-4 font-medium">Pitch Hook</th>
                <th className="px-4 py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead, index) => {
                const pitch = getPitchHook(lead);
                const loadMs = getMobileLoadMs(lead);
                const hasChatbot = getHasChatbot(lead);
                const reg = lead.region || lead["Region"] || region;
                const leadName = lead.business_name || lead["Business Name"] || lead.name || "Unknown Business";
                const phone = lead.phone || lead["Phone"] || lead.contact || lead["Contact"] || "Hidden";
                const email = lead.email || lead["Email"];
                const website = lead.website || lead["Website"];

                return (
                  <tr key={lead.id ?? index} className="hover:bg-surface-hover transition-colors">
                    {/* Business Name + Region */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 bg-surface border border-border text-foreground/60 font-mono">
                          {reg}
                        </span>
                        <span className="font-medium text-white">{leadName}</span>
                      </div>
                    </td>

                    {/* Contact & Phone */}
                    <td className="px-5 py-4 text-foreground/80 font-mono text-xs">
                      <div>{phone}</div>
                      {email && email !== "N/A" && (
                        <div className="text-foreground/50 text-[11px] truncate max-w-[180px]">{email}</div>
                      )}
                    </td>

                    {/* Website */}
                    <td className="px-5 py-4">
                      {website ? (
                        <a 
                          href={website.startsWith("http") ? website : `https://${website}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 hover:underline max-w-[200px] truncate"
                        >
                          <span className="truncate">{website.replace(/^https?:\/\//, "")}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-foreground/40 italic">No website</span>
                      )}
                    </td>

                    {/* Mobile Load Time (ms) */}
                    <td className="px-4 py-4 text-center">
                      {loadMs > 0 ? (
                        <span className={`inline-block font-mono text-xs px-2 py-0.5 border ${
                          loadMs > 3000 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}>
                          {loadMs.toLocaleString()} ms
                        </span>
                      ) : (
                        <span className="text-foreground/40 font-mono text-xs">N/A</span>
                      )}
                    </td>

                    {/* Chatbot Widget Status */}
                    <td className="px-4 py-4 text-center">
                      {hasChatbot ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          <Bot className="w-3 h-3" />
                          Detected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-surface border border-border text-foreground/40">
                          None
                        </span>
                      )}
                    </td>

                    {/* Pitch Hook Badge Column */}
                    <td className="px-5 py-4">
                      {pitch === "Pitch $750 Speed Overhaul (#2)" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          Pitch $750 Speed Overhaul (#2)
                        </span>
                      ) : pitch === "Pitch $1,000 RAG Bot (#4)" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                          <Bot className="w-3.5 h-3.5 text-cyan-400" />
                          Pitch $1,000 RAG Bot (#4)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          {pitch}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-[var(--color-success-bg)] text-success-400 border border-success-500 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-success-500" />
                        Extracted
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {leads.length === 0 && (
            <div className="p-12 text-center text-foreground/50 font-mono text-sm">
              No leads found. Select a target region, enter a niche and location, and start extraction.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
