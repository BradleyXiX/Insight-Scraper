"use client";

import { useState } from "react";
import { Search, Download, AlertCircle, Play } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function DashboardPage() {
  const { getToken, orgId } = useAuth();
  const [query, setQuery] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  
  const [leads, setLeads] = useState<any[]>([]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setIsScraping(true);
    
    try {
      const token = await getToken();
      
      console.log("Scraping for:", query, "Organization:", orgId);
      const res = await fetch("http://localhost:8000/api/scrape?query=" + encodeURIComponent(query), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      
      const data = await res.json();
      console.log(data);
      
      // Fetch the updated list of leads from the database
      const leadsRes = await fetch("http://localhost:8000/api/leads", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData);
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
        <h1 className="text-3xl font-display text-white">Lead Extraction</h1>
        <p className="text-foreground/70">Enter a target niche and location to begin scraping directories.</p>
      </div>

      {/* Action Bar */}
      <div className="panel p-6">
        <form onSubmit={handleScrape} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Plumbers in New York City" 
              className="w-full bg-surface border border-border rounded-none py-3 pl-12 pr-4 text-white placeholder:text-foreground/40 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
            />
          </div>
          <button 
            type="submit"
            disabled={isScraping || !query}
            className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-none font-medium hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow uppercase tracking-wider text-sm"
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
        </form>
        
        {/* Helper Note */}
        <div className="flex items-center gap-2 mt-4 text-sm text-foreground/50">
          <AlertCircle className="w-4 h-4" />
          <p>Scraping jobs may take a few minutes to complete depending on the directory size. Concurrency is limited to 1 active job.</p>
        </div>
      </div>

      {/* Results Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display text-white">Recent Leads</h2>
          <button className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-white transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        
        <div className="panel overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-foreground/50 uppercase bg-surface border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Business Name</th>
                <th className="px-6 py-4 font-medium">Contact Details</th>
                <th className="px-6 py-4 font-medium">Website</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{lead.business_name || lead.name || "Unknown"}</td>
                  <td className="px-6 py-4 text-foreground/70">{lead.contact || "N/A"}</td>
                  <td className="px-6 py-4">
                    {lead.website ? (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-primary-400 hover:text-primary-300 hover:underline">
                        {lead.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-foreground/40">No website</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold bg-[var(--color-success-bg)] text-success-400 border border-success-500 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-none bg-success-500"></span>
                      Extracted
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {leads.length === 0 && (
            <div className="p-8 text-center text-foreground/50 font-mono text-sm">
              No leads found. Start an extraction to populate this table.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
