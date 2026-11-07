"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { DEMO_LEADS, DEMO_QUERY, DEMO_REGION, DEMO_SOURCE, DEMO_STAGES } from "@/lib/demo-data";
import { getPitchHook, pitchTone } from "@/lib/leads";

export interface ExtractionDemoProps {
  variant?: "hero" | "sample";
}

export function ExtractionDemo({ variant = "hero" }: ExtractionDemoProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasStartedRef = useRef(false);
  const autoReplayCountRef = useRef(0);

  const [typedQuery, setTypedQuery] = useState("");
  const [regionAccented, setRegionAccented] = useState(false);
  const [sourceAccented, setSourceAccented] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [visibleRowCount, setVisibleRowCount] = useState(0);
  const [barsGrown, setBarsGrown] = useState(false);
  const [chatbotsResolved, setChatbotsResolved] = useState(false);
  const [pitchBadgesVisible, setPitchBadgesVisible] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [leadCount, setLeadCount] = useState(0);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const setTrackedTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const setFinalState = () => {
    setTypedQuery(DEMO_QUERY);
    setRegionAccented(true);
    setSourceAccented(true);
    setCurrentStageIndex(DEMO_STAGES.length - 1);
    setVisibleRowCount(DEMO_LEADS.length);
    setBarsGrown(true);
    setChatbotsResolved(true);
    setPitchBadgesVisible([true, true, true, true, true]);
    setLeadCount(25);
  };

  const runSequence = () => {
    clearAllTimers();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFinalState();
      return;
    }

    setTypedQuery("");
    setRegionAccented(false);
    setSourceAccented(false);
    setCurrentStageIndex(0);
    setVisibleRowCount(0);
    setBarsGrown(false);
    setChatbotsResolved(false);
    setPitchBadgesVisible([false, false, false, false, false]);
    setLeadCount(0);

    const query = DEMO_QUERY;
    for (let i = 1; i <= query.length; i++) {
      setTrackedTimeout(() => {
        setTypedQuery(query.slice(0, i));
      }, i * 40);
    }

    let time = query.length * 40;

    setTrackedTimeout(() => {
      setRegionAccented(true);
    }, time + 100);

    setTrackedTimeout(() => {
      setSourceAccented(true);
    }, time + 300);

    time += 500;

    for (let s = 1; s < DEMO_STAGES.length; s++) {
      setTrackedTimeout(() => {
        setCurrentStageIndex(s);
      }, time + s * 450);
    }

    time += (DEMO_STAGES.length - 1) * 450;

    for (let r = 1; r <= DEMO_LEADS.length; r++) {
      setTrackedTimeout(() => {
        setVisibleRowCount(r);
      }, time + (r - 1) * 120);
    }

    time += (DEMO_LEADS.length - 1) * 120 + 80;

    setTrackedTimeout(() => {
      setBarsGrown(true);
      setChatbotsResolved(true);
    }, time);

    time += 260;

    for (let b = 0; b < DEMO_LEADS.length; b++) {
      setTrackedTimeout(() => {
        setPitchBadgesVisible((prev) => {
          const next = [...prev];
          next[b] = true;
          return next;
        });
      }, time + b * 60);
    }

    time += DEMO_LEADS.length * 60;

    const counterStartTime = time;
    const counterDuration = 600;
    const targetCount = 25;
    const tickInterval = Math.floor(counterDuration / targetCount);

    for (let c = 1; c <= targetCount; c++) {
      setTrackedTimeout(() => {
        setLeadCount(c);
      }, counterStartTime + c * tickInterval);
    }

    time += counterDuration;

    setTrackedTimeout(() => {
      if (autoReplayCountRef.current < 2) {
        autoReplayCountRef.current += 1;
        setTrackedTimeout(() => {
          runSequence();
        }, 4000);
      }
    }, time + 200);
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Deferred so the effect itself does not synchronously set state.
      const timer = setTimeout(setFinalState, 0);
      return () => clearTimeout(timer);
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasStartedRef.current) {
          hasStartedRef.current = true;
          runSequence();
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      clearAllTimers();
    };
    // The sequence starts once per mount; runSequence is recreated each render and
    // must not re-arm the observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReplay = () => {
    autoReplayCountRef.current = 2;
    runSequence();
  };

  const stickyClass = variant === "hero" ? "sticky top-20 z-20" : "relative";

  return (
    <div
      ref={containerRef}
      className={`w-full panel bg-surface border border-border overflow-hidden pointer-events-auto ${stickyClass}`}
    >
      {/* Control bar */}
      <div className="p-4 border-b border-border bg-surface flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search query input mock */}
        <div className="flex-1 flex items-center gap-3 bg-background border border-border px-3 py-2">
          <Search className="w-5 h-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
          <div className="flex-1 font-mono text-sm text-foreground flex items-center">
            <span>{typedQuery}</span>
            {typedQuery.length < DEMO_QUERY.length && (
              <span className="inline-block w-2 h-4 bg-accent ml-0.5 animate-pulse" />
            )}
            {typedQuery.length === 0 && (
              <span className="text-foreground/40 font-sans">Awaiting prompt...</span>
            )}
          </div>
        </div>

        {/* Chips and status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Region chip */}
          <div
            className={`px-2.5 py-1 text-xs font-mono uppercase border transition-colors ${
              regionAccented
                ? "bg-accent-quiet text-accent border-accent/40"
                : "bg-background text-foreground/40 border-border"
            }`}
          >
            {DEMO_REGION}
          </div>

          {/* Source chip */}
          <div
            className={`px-2.5 py-1 text-xs font-mono uppercase border transition-colors ${
              sourceAccented
                ? "bg-accent-quiet text-accent border-accent/40"
                : "bg-background text-foreground/40 border-border"
            }`}
          >
            {DEMO_SOURCE}
          </div>

          {/* Counter badge */}
          <div className="px-3 py-1 bg-background border border-border text-xs font-mono tabular-nums text-foreground/70">
            <span className="text-white font-semibold">{leadCount}</span> / 25 leads
          </div>

          {/* Replay control */}
          <button
            onClick={handleReplay}
            type="button"
            className="px-3 py-1 text-xs uppercase tracking-wider text-foreground/70 hover:text-white border border-border hover:border-border-strong bg-surface hover:bg-surface-hover cursor-pointer transition-colors"
          >
            Replay
          </button>
        </div>
      </div>

      {/* Progress status strip */}
      <div className="px-4 py-2 bg-background border-b border-border flex items-center gap-4 overflow-x-auto">
        <span className="text-xs uppercase tracking-wider text-foreground/40 font-mono shrink-0">
          Stage
        </span>
        <div className="flex items-center gap-3 shrink-0">
          {DEMO_STAGES.map((stage, idx) => {
            const isActive = idx === currentStageIndex;
            const isDone = idx < currentStageIndex;
            return (
              <div key={stage} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-foreground/20 text-xs">&rarr;</span>}
                <span
                  className={`text-xs font-mono uppercase flex items-center gap-1 transition-colors ${
                    isActive
                      ? "text-accent font-semibold"
                      : isDone
                      ? "text-foreground/80"
                      : "text-foreground/30"
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 bg-accent shrink-0" />}
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-border bg-surface text-foreground/50 text-xs uppercase font-medium">
            <tr>
              <th className="py-3 px-4">Company</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Mobile load</th>
              <th className="py-3 px-4 text-center">Chatbot</th>
              <th className="py-3 px-4">Pitch hook</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-xs">
            {DEMO_LEADS.map((lead, i) => {
              const isVisible = i < visibleRowCount;
              const hook = getPitchHook({
                mobile_load_ms: lead.loadMs,
                has_chatbot_widget: lead.hasChatbot,
                business_name: lead.name,
              });
              const tone = pitchTone(hook);
              const toneClasses =
                tone === "attention"
                  ? "bg-attention-quiet text-attention border-attention/30"
                  : tone === "accent"
                  ? "bg-accent-quiet text-accent border-accent/30"
                  : "bg-surface-hover text-foreground/70 border-border";

              const loadRatio = Math.min(1, lead.loadMs / 7000);

              return (
                <tr
                  key={lead.name}
                  className="hover:bg-surface-hover/50"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateY(0)" : "translateY(8px)",
                    transition:
                      "transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  {/* Company */}
                  <td className="py-3 px-4">
                    <div className="font-sans font-medium text-white text-sm">{lead.name}</div>
                    <div className="text-foreground/50 text-xs font-mono">
                      {lead.region} &bull; {lead.website.replace("https://", "")}
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-3 px-4 text-foreground/70 font-mono">{lead.phone}</td>

                  {/* Mobile load */}
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-xs ${
                            lead.loadMs > 3000 ? "text-attention" : "text-accent"
                          }`}
                        >
                          {lead.loadMs.toLocaleString()} ms
                        </span>
                        <span className="text-foreground/40 text-xs font-sans">
                          {lead.loadMs > 3000 ? "Slow" : "Fast"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-background w-28 overflow-hidden border border-border">
                        <div
                          className={`h-full origin-left ${
                            lead.loadMs > 3000 ? "bg-attention" : "bg-accent"
                          }`}
                          style={{
                            transform: barsGrown ? `scaleX(${loadRatio})` : "scaleX(0)",
                            transition: "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Chatbot */}
                  <td className="py-3 px-4 text-center">
                    {chatbotsResolved ? (
                      lead.hasChatbot ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-mono bg-accent-quiet text-accent border border-accent/30 uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-mono bg-surface-hover text-foreground/50 border border-border uppercase">
                          None
                        </span>
                      )
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-mono text-foreground/30 uppercase">
                        Checking
                      </span>
                    )}
                  </td>

                  {/* Pitch hook */}
                  <td className="py-3 px-4">
                    <div
                      style={{
                        transform: pitchBadgesVisible[i] ? "scale(1)" : "scale(0.98)",
                        opacity: pitchBadgesVisible[i] ? 1 : 0,
                        transition:
                          "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      <span
                        className={`inline-block px-2.5 py-1 text-xs border font-sans font-medium ${toneClasses}`}
                      >
                        {hook}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExtractionDemo;

