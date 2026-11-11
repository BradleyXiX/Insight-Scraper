"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Layers, Play } from "lucide-react";
import { useAppAuth } from "@/lib/app-auth";
import {
  createBatch,
  formatJobTime,
  isActiveJob,
  listJobs,
  REGION_OPTIONS,
  DEFAULT_SOURCE_INFO,
  type BatchItemInput,
  type BatchResponse,
  type JobPage,
  type ScrapeJob,
  type SourceMap,
} from "@/lib/jobs";
import { NETWORK_FAILURE, readFailure } from "@/lib/errors";

const LIMIT_OPTIONS = [10, 25, 50];

export interface BatchPanelProps {
  onSelectJob?: (job: ScrapeJob) => void;
  selectedJobId?: string | null;
  sourceMap?: SourceMap;
}

export function BatchPanel({ onSelectJob, selectedJobId, sourceMap }: BatchPanelProps) {
  const { getToken } = useAppAuth();

  const currentSourceMap = sourceMap ?? DEFAULT_SOURCE_INFO;
  const sourceOptions = Object.entries(currentSourceMap).map(([value, info]) => ({
    value,
    label: info.label,
    degraded: info.degraded,
    note: info.note,
  }));

  const [queriesText, setQueriesText] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["US"]);
  const [source, setSource] = useState("gmaps");
  const [limit, setLimit] = useState(25);

  const activeSourceInfo = currentSourceMap[source];

  const [batchId, setBatchId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = queriesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const totalCalculated = lines.length * selectedRegions.length;
  const isOverLimit = totalCalculated > 25;
  const canSubmit = lines.length > 0 && selectedRegions.length > 0 && !isOverLimit && !submitting;

  const toggleRegion = (reg: string) => {
    setSelectedRegions((prev) =>
      prev.includes(reg) ? prev.filter((r) => r !== reg) : [...prev, reg],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const items: BatchItemInput[] = [];
    for (const query of lines) {
      for (const region of selectedRegions) {
        items.push({ query, region, source, limit });
      }
    }

    try {
      const response = await createBatch(getToken, items);
      if (!response.ok) {
        setError(await readFailure(response));
        return;
      }
      const data: BatchResponse = await response.json();
      setBatchId(data.batch_id);
      setJobs(data.jobs);
      if (data.jobs.length > 0 && onSelectJob) {
        onSelectJob(data.jobs[0]);
      }
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!batchId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await listJobs(getToken, { limit: 50, offset: 0, batch_id: batchId });
        if (cancelled) return;

        if (response.ok) {
          const page: JobPage = await response.json();
          if (cancelled) return;
          setJobs(page.jobs);

          const hasActive = page.jobs.some((job) => isActiveJob(job));
          if (hasActive) {
            timer = setTimeout(poll, 1500);
          }
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, 3000);
        }
      }
    };

    timer = setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [batchId, getToken]);

  const queuedCount = jobs.filter((j) => j.status === "queued").length;
  const runningCount = jobs.filter((j) => j.status === "running").length;
  const succeededCount = jobs.filter((j) => j.status === "succeeded").length;
  const failedCount = jobs.filter((j) => j.status === "failed" || j.status === "cancelled").length;

  return (
    <div className="panel p-6 space-y-6">
      {error && (
        <div className="p-4 bg-surface border border-danger/40 flex items-center gap-3 text-sm">
          <span className="w-2 h-2 bg-danger inline-block shrink-0" aria-hidden="true" />
          <p className="text-danger font-mono text-xs">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="batch-queries" className="block text-xs font-mono uppercase tracking-wider text-foreground/70 mb-2">
            Target queries (one per line)
          </label>
          <textarea
            id="batch-queries"
            value={queriesText}
            onChange={(e) => setQueriesText(e.target.value)}
            rows={4}
            placeholder={"dentists in London\nplumbers in Manchester\nroofers in Birmingham"}
            className="w-full bg-surface border border-border rounded-none p-3 text-white placeholder:text-foreground/60 focus:outline-none focus:border-accent font-mono text-sm"
          />
        </div>

        <div>
          <span className="block text-xs font-mono uppercase tracking-wider text-foreground/70 mb-2">
            Target regions
          </span>
          <div className="flex flex-wrap gap-4">
            {REGION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-xs font-mono cursor-pointer text-foreground select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(opt.value)}
                  onChange={() => toggleRegion(opt.value)}
                  className="rounded-none accent-accent cursor-pointer"
                />
                <span>
                  {opt.label} ({opt.value})
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <div className="flex flex-col w-full md:w-52">
            <div className="relative w-full">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
                aria-label="Batch scraping source"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-surface text-white">
                    {opt.label}{opt.degraded ? " (Degraded)" : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            {activeSourceInfo?.degraded && activeSourceInfo.note && (
              <p className="text-xs font-mono text-attention mt-1">
                {activeSourceInfo.note}
              </p>
            )}
          </div>

          <div className="relative w-full md:w-36">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
              aria-label="Batch lead limit"
            >
              {LIMIT_OPTIONS.map((val) => (
                <option key={val} value={val} className="bg-surface text-white">
                  {val} leads
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs font-mono">
              <span className="text-foreground/70">
                Calculated: {totalCalculated} / 25 items ({lines.length} queries × {selectedRegions.length} regions)
              </span>
              {isOverLimit && (
                <p className="text-danger mt-1">Exceeds 25 item limit. Reduce queries or regions.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center justify-center gap-2 bg-white text-black border border-transparent px-7 py-3 rounded-none font-semibold enabled:hover:bg-zinc-200 disabled:bg-surface-hover disabled:text-foreground/60 disabled:border-border disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              <span>{submitting ? "Queueing..." : "Start batch"}</span>
            </button>
          </div>
        </div>
      </form>

      {jobs.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <h3 className="heading-6 text-foreground">Batch progress</h3>
              <span className="text-xs font-mono text-foreground/60">
                ({jobs.length} total)
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-foreground/70">Queued: {queuedCount}</span>
              <span className="text-accent">Running: {runningCount}</span>
              <span className="text-foreground">Done: {succeededCount}</span>
              {failedCount > 0 && <span className="text-danger">Failed: {failedCount}</span>}
            </div>
          </div>

          <div className="border border-border divide-y divide-border overflow-x-auto">
            {jobs.map((j) => {
              const isSelected = selectedJobId === j.id;
              return (
                <div
                  key={j.id}
                  onClick={() => onSelectJob?.(j)}
                  className={`flex items-center justify-between p-3 gap-4 text-xs font-mono transition-colors cursor-pointer ${
                    isSelected ? "bg-surface-hover" : "hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 shrink-0 ${
                        j.status === "succeeded"
                          ? "bg-foreground"
                          : j.status === "running"
                            ? "bg-accent motion-safe:animate-pulse"
                            : j.status === "failed" || j.status === "cancelled"
                              ? "bg-danger"
                              : "bg-foreground/40"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-white truncate font-medium">{j.query}</span>
                    <span className="text-foreground/60 shrink-0">
                      {j.region} · {j.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-foreground/70">
                      {j.result_count > 0 ? `${j.result_count} leads` : j.status}
                    </span>
                    <span className="text-foreground/40 hidden sm:inline">
                      {formatJobTime(j.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
