"use client";

import { useState } from "react";
import { Search, Download, AlertCircle, Play } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function DashboardPage() {
  const { getToken, orgId } = useAuth();
  const [query, setQuery] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  
  // Mock Data for the UI
  const mockLeads = [
    { id: 1, name: "Acme Corp", contact: "john@acmecorp.com", website: "acmecorp.com", status: "Extracted" },
    { id: 2, name: "Stark Industries", contact: "tony@stark.com", website: "stark.com", status: "Extracted" },
    { id: 3, name: "Wayne Enterprises", contact: "bruce@wayne.com", website: "wayne.com", status: "Extracted" },
  ];

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setIsScraping(true);
    
    try {
      const token = await getToken();
      // Implementation for API call to /api/scrape
      console.log("Scraping for:", query, "Organization:", orgId);
      // await fetch("http://localhost:8000/api/scrape?query=" + encodeURIComponent(query), {
      //   method: "POST",
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(error);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Lead Extraction</h1>
        <p className="text-zinc-400">Enter a target niche and location to begin scraping directories.</p>
      </div>

      {/* Action Bar */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
        <form onSubmit={handleScrape} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Plumbers in New York City" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isScraping || !query}
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_-5px_rgba(79,70,229,0.6)]"
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
        <div className="flex items-center gap-2 mt-4 text-sm text-zinc-500">
          <AlertCircle className="w-4 h-4" />
          <p>Scraping jobs may take a few minutes to complete depending on the directory size. Concurrency is limited to 1 active job.</p>
        </div>
      </div>

      {/* Results Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Leads</h2>
          <button className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/50 border-b border-zinc-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Business Name</th>
                <th className="px-6 py-4 font-medium">Contact Details</th>
                <th className="px-6 py-4 font-medium">Website</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {mockLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{lead.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{lead.contact}</td>
                  <td className="px-6 py-4">
                    <a href={`https://${lead.website}`} className="text-indigo-400 hover:text-indigo-300 hover:underline">
                      {lead.website}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {mockLeads.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No leads found. Start an extraction to populate this table.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
