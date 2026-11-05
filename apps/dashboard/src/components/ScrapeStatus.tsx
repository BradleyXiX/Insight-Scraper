"use client";

import React, { useEffect, useState } from "react";

export type ScrapeState =
  | { phase: "idle" }
  | { phase: "running"; startedAt: number }
  | { phase: "done"; count: number }
  | { phase: "empty" }
  | { phase: "error"; message: string };

export interface ScrapeStatusProps {
  state: ScrapeState;
  onCancel: () => void;
  onRetry?: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function ScrapeStatus({ state, onCancel, onRetry }: ScrapeStatusProps): React.ReactElement | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.phase !== "running") return;
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [state.phase]);

  if (state.phase === "idle") {
    return null;
  }

  if (state.phase === "error") {
    return (
      <div className="panel p-4 bg-surface border border-danger/40 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-danger inline-block" aria-hidden="true" />
          <p className="text-danger font-mono text-xs">
            {state.message}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1 bg-surface border border-border text-white hover:border-foreground/50 cursor-pointer transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (state.phase === "empty") {
    return (
      <div className="panel p-4 bg-surface border border-border flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-foreground/40 inline-block" aria-hidden="true" />
          <p className="text-foreground/80 font-mono text-xs">
            No leads found for this search. Try a broader search term or different region.
          </p>
        </div>
      </div>
    );
  }

  const elapsed = state.phase === "running" ? Math.max(0, Math.floor((now - state.startedAt) / 1000)) : 0;
  const isRunning = state.phase === "running";
  const isDone = state.phase === "done";

  return (
    <div className="panel p-4 bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* 3 stages strip */}
      <div className="flex items-center gap-3 text-xs font-mono">
        {/* Stage 1: Queued */}
        <span className="text-foreground/60 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-foreground/60 inline-block" aria-hidden="true" />
          Queued
        </span>

        <span className="text-border-strong font-mono" aria-hidden="true">→</span>

        {/* Stage 2: Extracting */}
        <span className={`flex items-center gap-1.5 ${isRunning ? "text-accent font-medium" : "text-foreground/60"}`}>
          {isRunning ? (
            <span
              className="inline-block w-2 h-2 bg-accent motion-safe:animate-pulse"
              style={{ boxShadow: "0 0 8px rgba(24, 169, 194, 0.7)" }}
              aria-hidden="true"
            />
          ) : (
            <span className="w-1.5 h-1.5 bg-foreground/60 inline-block" aria-hidden="true" />
          )}
          <span>Extracting</span>
          {isRunning && (
            <>
              {elapsed > 20 ? (
                <span className="text-foreground/70 flex items-center gap-2 pl-1">
                  <span>(still extracting)</span>
                  <span className="inline-block w-16 h-1 bg-border overflow-hidden relative">
                    <span className="absolute inset-y-0 left-0 w-1/2 bg-accent motion-safe:animate-pulse" />
                  </span>
                </span>
              ) : (
                <span className="text-foreground/70 tabular-nums pl-1">
                  {formatElapsed(elapsed)}
                </span>
              )}
            </>
          )}
        </span>

        <span className="text-border-strong font-mono" aria-hidden="true">→</span>

        {/* Stage 3: Done */}
        <span className={`flex items-center gap-1.5 ${isDone ? "text-accent font-semibold" : "text-foreground/40"}`}>
          <span className={`w-1.5 h-1.5 inline-block ${isDone ? "bg-accent" : "bg-foreground/30"}`} aria-hidden="true" />
          <span>Done</span>
          {isDone && (
            <span className="text-foreground/80 pl-1 font-normal">
              ({state.count} leads found)
            </span>
          )}
        </span>
      </div>

      {/* Cancel button: visible only while running */}
      {isRunning && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-mono text-foreground/60 hover:text-white underline underline-offset-4 cursor-pointer self-start sm:self-auto transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

export default ScrapeStatus;

