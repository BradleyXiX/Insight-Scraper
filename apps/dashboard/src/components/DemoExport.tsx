"use client";

import React from "react";
import { Download, FileJson } from "lucide-react";
import { downloadFile, exportBaseName } from "@/lib/download";
import { toCsv, toJson, type LeadItem } from "@/lib/leads";

export interface DemoExportProps {
  leads: LeadItem[];
  region: string;
  query: string;
}

/** The dashboard's export buttons, wired to the frozen sample instead of a job. */
export function DemoExport({ leads, region, query }: DemoExportProps): React.ReactElement {
  const base = exportBaseName({ query, region });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
      <p className="text-xs font-mono text-foreground/60">
        Take the sample with you. Phone and email are masked in this copy.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            downloadFile(
              `${base}.csv`,
              toCsv(leads, { region, query }),
              "text/csv;charset=utf-8;",
            )
          }
          className="flex items-center justify-center gap-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 px-4 py-2 rounded-none font-medium transition-colors uppercase tracking-wider text-xs whitespace-nowrap cursor-pointer"
        >
          <Download className="w-4 h-4" strokeWidth={1.5} />
          CSV
        </button>
        <button
          type="button"
          onClick={() =>
            downloadFile(
              `${base}.json`,
              toJson(leads, { region, query }),
              "application/json;charset=utf-8;",
            )
          }
          className="flex items-center justify-center gap-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 px-4 py-2 rounded-none font-medium transition-colors uppercase tracking-wider text-xs whitespace-nowrap cursor-pointer"
        >
          <FileJson className="w-4 h-4" strokeWidth={1.5} />
          JSON
        </button>
      </div>
    </div>
  );
}

export default DemoExport;
