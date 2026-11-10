"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Download, AlertCircle, Play, ChevronDown, FileJson } from "lucide-react";
import { useAppAuth } from "@/lib/app-auth";
import {
  DEFAULT_SETTINGS,
  getJob,
  getJobLeads,
  getSettings,
  isActiveJob,
  jobStartedAt,
  listJobs,
  REGION_OPTIONS,
  SOURCE_OPTIONS,
  startScrape,
  cancelJob,
  type JobPage,
  type ScrapeJob,
  type WorkspaceSettings,
} from "@/lib/jobs";
import { NETWORK_FAILURE, readFailure } from "@/lib/errors";
import { LeadItem, toCsv, toJson } from "@/lib/leads";
import { downloadFile, exportBaseName } from "@/lib/download";
import { KpiStrip } from "@/components/KpiStrip";
import { ScrapeStatus, type ScrapeState } from "@/components/ScrapeStatus";
import { LeadResults } from "@/components/LeadResults";
import { BatchPanel } from "@/components/BatchPanel";

const LIMIT_OPTIONS = [10, 25, 50];

function duplicateNote(count: number): string | undefined {
  if (count <= 0) return undefined;
  return `${count} duplicate${count === 1 ? "" : "s"} skipped`;
}

/** Map the API's job status onto the three-stage strip the dashboard renders. */
function stateForJob(job: ScrapeJob): ScrapeState {
  switch (job.status) {
    case "queued":
    case "running":
      return { phase: "running", startedAt: jobStartedAt(job) };
    case "succeeded":
      return {
        phase: "done",
        count: job.result_count,
        note: duplicateNote(job.duplicate_count),
      };
    case "empty":
      return {
        phase: "empty",
        note:
          job.duplicate_count > 0
            ? `All ${job.duplicate_count} result${job.duplicate_count === 1 ? " was" : "s were"} already in your history.`
            : undefined,
      };
    case "cancelled":
      return { phase: "cancelled" };
    case "failed":
      return {
        phase: "error",
        message: job.error || "The extraction failed. Retry or change the source.",
      };
    default:
      return { phase: "idle" };
  }
}

/** Copy for the empty lead table, matched to the run's real outcome. */
function emptyLeadsMessage(state: ScrapeState, hasJob: boolean): string | undefined {
  switch (state.phase) {
    case "running":
      return "Extraction in progress. Leads appear here as soon as the run finishes.";
    case "cancelled":
      return "This run was cancelled before any leads were saved.";
    case "error":
      return "This run did not finish. Fix the error above and retry.";
    case "done":
      return undefined;
    default:
      return hasJob ? undefined : "No extraction yet. Start a search to collect leads.";
  }
}

export default function DashboardPage() {
  const { getToken } = useAppAuth();

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState(DEFAULT_SETTINGS.default_region);
  const [source, setSource] = useState(DEFAULT_SETTINGS.default_source);
  const [limit, setLimit] = useState(DEFAULT_SETTINGS.default_limit);

  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [scrapeState, setScrapeState] = useState<ScrapeState>({ phase: "idle" });
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  const loadLeads = useCallback(
    async (jobId: string) => {
      try {
        const response = await getJobLeads(getToken, jobId);
        if (!response.ok) {
          setLoadError(await readFailure(response));
          return;
        }
        const payload: { leads?: LeadItem[] } = await response.json();
        setLeads(Array.isArray(payload.leads) ? payload.leads : []);
      } catch {
        setLoadError(NETWORK_FAILURE);
      }
    },
    [getToken],
  );

  /** Restore defaults and the most recent run after a refresh. */
  const loadWorkspace = useCallback(async () => {
    try {
      const settingsResponse = await getSettings(getToken);
      setLoadError(null);
      if (settingsResponse.ok) {
        const settings: WorkspaceSettings = await settingsResponse.json();
        setRegion(settings.default_region);
        setSource(settings.default_source);
        setLimit(settings.default_limit);
      }

      const jobsResponse = await listJobs(getToken, { limit: 1, offset: 0 });
      if (!jobsResponse.ok) {
        setLoadError(await readFailure(jobsResponse));
        return;
      }

      const page: JobPage = await jobsResponse.json();
      const latest = page.jobs[0];
      if (!latest) return;

      setJob(latest);
      setQuery(latest.query);
      setRegion(latest.region);
      setSource(latest.source);
      setLimit(latest.limit);
      setScrapeState(stateForJob(latest));

      if (isActiveJob(latest)) {
        setActiveJobId(latest.id);
      } else if (latest.status === "succeeded" || latest.status === "empty") {
        await loadLeads(latest.id);
      }
    } catch {
      setLoadError(NETWORK_FAILURE);
    }
  }, [getToken, loadLeads]);

  useEffect(() => {
    // Deferred: the loader sets state after its first await, and deferring keeps the
    // effect free of synchronous cascading renders.
    const timer = setTimeout(() => {
      void loadWorkspace();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadWorkspace]);

  /** Poll the active job until it reaches a terminal status. */
  useEffect(() => {
    if (!activeJobId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await getJob(getToken, activeJobId);
        if (cancelled) return;

        if (!response.ok) {
          setScrapeState({ phase: "error", message: await readFailure(response) });
          setActiveJobId(null);
          return;
        }

        const { job: next }: { job: ScrapeJob } = await response.json();
        if (cancelled) return;

        setJob(next);
        setScrapeState(stateForJob(next));

        if (next.status === "succeeded") {
          await loadLeads(next.id);
          if (!cancelled) setActiveJobId(null);
          return;
        }

        if (next.status === "empty") {
          setLeads([]);
          setActiveJobId(null);
          return;
        }

        if (next.status === "failed" || next.status === "cancelled") {
          setActiveJobId(null);
          return;
        }

        timer = setTimeout(poll, 1500);
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, 3000);
        }
      }
    };

    timer = setTimeout(poll, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeJobId, getToken, loadLeads]);

  const isRunning = scrapeState.phase === "running" || Boolean(activeJobId);

  const handleScrape = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isRunning || busy) return;

    setBusy(true);
    setLoadError(null);
    setLeads([]);
    setScrapeState({ phase: "running", startedAt: Date.now() });

    try {
      const response = await startScrape(getToken, {
        query: trimmed,
        region,
        source,
        limit,
      });

      if (!response.ok) {
        setScrapeState({ phase: "error", message: await readFailure(response) });
        return;
      }

      const { job: created }: { job: ScrapeJob } = await response.json();
      setJob(created);
      setScrapeState(stateForJob(created));
      setActiveJobId(created.id);
    } catch {
      setScrapeState({ phase: "error", message: NETWORK_FAILURE });
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    const jobId = activeJobId ?? (job && isActiveJob(job) ? job.id : null);
    if (!jobId || busy) return;

    setBusy(true);
    try {
      const response = await cancelJob(getToken, jobId);
      if (!response.ok) {
        setLoadError(await readFailure(response));
        return;
      }
      const { job: next }: { job: ScrapeJob } = await response.json();
      setJob(next);
      setScrapeState(stateForJob(next));
      setActiveJobId(isActiveJob(next) ? next.id : null);
    } catch {
      setLoadError(NETWORK_FAILURE);
    } finally {
      setBusy(false);
    }
  };

  const exportTarget = {
    query: job?.query ?? query,
    region: job?.region ?? region,
    id: job?.id,
  };

  const handleExportCsv = () => {
    if (leads.length === 0) return;
    downloadFile(
      `${exportBaseName(exportTarget)}.csv`,
      toCsv(leads, { region: exportTarget.region, query: exportTarget.query }),
      "text/csv;charset=utf-8;",
    );
  };

  const handleExportJson = () => {
    if (leads.length === 0) return;
    downloadFile(
      `${exportBaseName(exportTarget)}.json`,
      toJson(leads, { region: exportTarget.region, query: exportTarget.query }),
      "application/json;charset=utf-8;",
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="heading-4 text-foreground">International lead and signal scraper</h1>
          <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-accent-quiet text-accent border border-accent/40 uppercase">
            Global multi source
          </span>
        </div>
        <p className="text-foreground/70">
          Target a niche and location across the US, UK, Australia, Canada, UAE, and Kenya.
          Each run measures mobile load time, detects chat widgets, and writes a pitch hook.
        </p>
      </div>

      {loadError && (
        <div className="panel p-4 bg-surface border border-danger/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-danger inline-block shrink-0" aria-hidden="true" />
            <p className="text-danger font-mono text-xs">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadWorkspace()}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1 bg-surface border border-border text-white hover:border-foreground/50 cursor-pointer transition-colors self-start sm:self-auto"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === "single"
              ? "border-b-2 border-accent text-white font-semibold"
              : "text-foreground/60 hover:text-white"
          }`}
        >
          Single search
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("batch")}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === "batch"
              ? "border-b-2 border-accent text-white font-semibold"
              : "text-foreground/60 hover:text-white"
          }`}
        >
          Batch
        </button>
      </div>

      {activeTab === "single" ? (
        <div className="panel p-6 space-y-4">
          <form onSubmit={handleScrape} className="flex flex-col md:flex-row gap-3">
            <div className="relative w-full md:w-36">
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
                aria-label="Target region"
              >
                {REGION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-surface text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="relative w-full md:w-52">
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
                aria-label="Scraping source"
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-surface text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="relative w-full md:w-32">
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
                aria-label="Lead limit"
              >
                {LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value} className="bg-surface text-white">
                    {value} leads
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. medspas in Austin TX, dentists in London"
                maxLength={200}
                className="w-full bg-surface border border-border rounded-none py-3 pl-12 pr-4 text-white placeholder:text-foreground/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isRunning || busy || !query.trim()}
              className="flex items-center justify-center gap-2 bg-white text-black border border-transparent px-7 py-3 rounded-none font-semibold enabled:hover:bg-zinc-200 disabled:bg-surface-hover disabled:text-foreground/60 disabled:border-border disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap w-full md:w-48"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent motion-safe:animate-pulse inline-block" />
                  Extracting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start extraction
                </span>
              )}
            </button>
          </form>

          <ScrapeStatus
            state={scrapeState}
            onCancel={handleCancel}
            onRetry={() => void handleScrape()}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              <AlertCircle className="w-4 h-4 text-accent shrink-0" />
              <p>
                Six regions, three sources, 1–50 leads per run. Re-running a query does not
                duplicate leads you already have.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={leads.length === 0}
                className="flex items-center justify-center gap-2 bg-surface border border-border text-foreground enabled:hover:text-white enabled:hover:border-foreground/40 px-4 py-2 rounded-none font-medium disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors uppercase tracking-wider text-xs whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                disabled={leads.length === 0}
                className="flex items-center justify-center gap-2 bg-surface border border-border text-foreground enabled:hover:text-white enabled:hover:border-foreground/40 px-4 py-2 rounded-none font-medium disabled:text-foreground/60 disabled:cursor-not-allowed transition-colors uppercase tracking-wider text-xs whitespace-nowrap"
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>
            </div>
          </div>
        </div>
      ) : (
        <BatchPanel
          selectedJobId={job?.id}
          onSelectJob={(selectedJob) => {
            setJob(selectedJob);
            setQuery(selectedJob.query);
            setRegion(selectedJob.region);
            setSource(selectedJob.source);
            setLimit(selectedJob.limit);
            setScrapeState(stateForJob(selectedJob));
            if (selectedJob.status === "succeeded" || selectedJob.status === "empty") {
              void loadLeads(selectedJob.id);
            }
          }}
        />
      )}

      <KpiStrip leads={leads} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="heading-6 text-foreground">Extracted leads</h2>
            <span className="px-2 py-0.5 text-xs font-mono bg-surface border border-border text-foreground/70">
              {leads.length} shown
            </span>
            {job && (
              <span className="text-xs font-mono text-foreground/60">
                {job.query} · {job.region} · {job.source}
              </span>
            )}
          </div>
        </div>

        <LeadResults
          leads={leads}
          region={job?.region ?? region}
          emptyMessage={emptyLeadsMessage(scrapeState, Boolean(job))}
        />
      </div>
    </div>
  );
}
