"use client";

import { History, Download, Clock } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Extraction History</h1>
        <p className="text-zinc-400">View and download your past lead extractions.</p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <Clock className="w-12 h-12 text-zinc-600 mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">No history yet</h3>
        <p className="text-zinc-400 max-w-md">
          Your extraction history will appear here once you start scraping directories.
        </p>
      </div>
    </div>
  );
}
