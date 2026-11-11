"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileJson,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useAppAuth } from "@/lib/app-auth";
import { NETWORK_FAILURE, readFailure } from "@/lib/errors";
import {
  deleteJob,
  formatJobTime,
  getJobLeads,
  listJobs,
  rerunJob,
  type JobPage,
  type JobStatus,
  type ScrapeJob,
} from "@/lib/jobs";
import { LeadItem, toCsv, toJson } from "@/lib/leads";
import { downloadFile, exportBaseName } from "@/lib/download";
import { LeadResults } from "@/components/LeadResults";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<JobStatus, string> = {
  queued: "text-attention border-attention/40 bg-attention-quiet",
  running: "text-attention border-attention/40 bg-attention-quiet",
  succeeded: "text-accent border-accent/40 bg-accent-quiet",
  empty: "text-foreground/70 border-border bg-surface-hover",
  failed: "text-danger border-danger/40 bg-danger-quiet",
  cancelled: "text-foreground/60 border-border bg-surface",
};

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  empty: "No results",
  failed: "Failed",
  cancelled: "Cancelled",
};

interface SelectedRun {
  job: ScrapeJob;
  leads: LeadItem[];
}

export default function HistoryPage() {
  const { getToken } = useAppAuth();
  const router = useRouter();

  const [page, setPage] = useState<JobPage>({
    jobs: [],
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
  });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedRun | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await listJobs(getToken, { limit: PAGE_SIZE, offset });
      if (!response.ok) {
        setError(await readFailure(response));
        return;
      }
      const nextPage: JobPage = await response.json();
      setPage(nextPage);
      setError(null);
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setLoading(false);
    }
  }, [getToken, offset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const handleOpen = async (job: ScrapeJob) => {
    if (selected?.job.id === job.id) {
      setSelected(null);
      return;
    }

    setBusyId(job.id);
    setNotice(null);
    try {
      const response = await getJobLeads(getToken, job.id);
      if (!response.ok) {
        setError(await readFailure(response));
        return;
      }
      const payload: { job: ScrapeJob; leads?: LeadItem[] } = await response.json();
      setSelected({ job: payload.job, leads: payload.leads ?? [] });
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setBusyId(null);
    }
  };

  const handleRerun = async (job: ScrapeJob) => {
    setBusyId(job.id);
    setNotice(null);
    try {
      const response = await rerunJob(getToken, job.id);
      if (!response.ok) {
        setError(await readFailure(response));
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (job: ScrapeJob) => {
    const confirmed = window.confirm(
      `Delete the run "${job.query}"? Its leads are removed too. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(job.id);
    setNotice(null);
    try {
      const response = await deleteJob(getToken, job.id);
      if (response.status !== 204) {
        setError(await readFailure(response));
        return;
      }
      if (selected?.job.id === job.id) {
        setSelected(null);
      }
      setNotice("Run deleted.");
      if (page.jobs.length === 1 && offset > 0) {
        setOffset(Math.max(0, offset - PAGE_SIZE));
      } else {
        await load();
      }
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setBusyId(null);
    }
  };

  const exportSelected = (format: "csv" | "json") => {
    if (!selected) return;
    const target = {
      query: selected.job.query,
      region: selected.job.region,
      id: selected.job.id,
    };
    const fallback = { query: selected.job.query, region: selected.job.region };

    if (format === "csv") {
      downloadFile(
        `${exportBaseName(target)}.csv`,
        toCsv(selected.leads, fallback),
        "text/csv;charset=utf-8;",
      );
      return;
    }

    downloadFile(
      `${exportBaseName(target)}.json`,
      toJson(selected.leads, fallback),
      "application/json;charset=utf-8;",
    );
  };

  const firstRow = page.total === 0 ? 0 : offset + 1;
  const lastRow = Math.min(offset + page.jobs.length, page.total);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="heading-4 text-foreground">Extraction history</h1>
        <p className="text-foreground/70">
          Every run is stored. Open one to see its leads, re-run the same parameters, or
          delete it.
        </p>
      </div>

      {error && (
        <div className="panel p-4 bg-surface border border-danger/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-danger inline-block shrink-0" aria-hidden="true" />
            <p className="text-danger font-mono text-xs">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1 bg-surface border border-border text-white hover:border-foreground/50 cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="panel p-4 bg-surface border border-border flex items-center gap-3">
          <span className="w-2 h-2 bg-accent inline-block shrink-0" aria-hidden="true" />
          <p className="text-foreground/80 font-mono text-xs">{notice}</p>
        </div>
      )}

      {loading ? (
        <div className="panel p-12 text-center">
          <p className="text-foreground/60 font-mono text-sm">Loading runs…</p>
        </div>
      ) : page.jobs.length === 0 ? (
        <div className="panel p-12 text-center flex flex-col items-center gap-4">
          <p className="text-foreground/60 font-mono text-sm">
            No extractions yet. Start one and it will appear here.
          </p>
          <Link
            href="/dashboard"
            className="text-xs font-mono uppercase tracking-wider px-4 py-2 bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
          >
            New extraction
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3">
            {page.jobs.map((job) => {
              const isBusy = busyId === job.id;
              const isOpen = selected?.job.id === job.id;

              return (
                <li key={job.id} className="panel p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-sm font-semibold text-white break-words">
                          {job.query}
                        </h2>
                        <span
                          className={`px-2 py-0.5 text-xs font-mono uppercase tracking-wider border ${STATUS_STYLES[job.status]}`}
                        >
                          {STATUS_LABELS[job.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-foreground/60">
                        <span>{formatJobTime(job.created_at)}</span>
                        <span>
                          {job.region} · {job.source} · {job.limit} leads
                        </span>
                        <span>
                          {job.result_count} saved
                          {job.duplicate_count > 0
                            ? ` · ${job.duplicate_count} duplicate${job.duplicate_count === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      </div>
                      {job.status === "failed" && job.error && (
                        <p className="text-xs font-mono text-danger break-words">{job.error}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleOpen(job)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isOpen ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {isOpen ? "Close" : "Open"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRerun(job)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Re-run
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(job)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-2 bg-surface border border-border text-foreground hover:text-danger hover:border-danger/40 disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {isOpen && selected && (
                    <div className="mt-5 pt-5 border-t border-border space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs font-mono text-foreground/60">
                          {selected.leads.length} lead
                          {selected.leads.length === 1 ? "" : "s"} in this run · outreach emails ready
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => exportSelected("csv")}
                            disabled={selected.leads.length === 0}
                            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => exportSelected("json")}
                            disabled={selected.leads.length === 0}
                            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors"
                          >
                            <FileJson className="w-4 h-4" />
                            JSON
                          </button>
                        </div>
                      </div>
                      <LeadResults
                        leads={selected.leads}
                        region={selected.job.region}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs font-mono text-foreground/60">
              Showing {firstRow}–{lastRow} of {page.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider px-3 py-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= page.total}
                className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider px-3 py-2 bg-surface border border-border text-foreground hover:text-white hover:border-foreground/40 disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
