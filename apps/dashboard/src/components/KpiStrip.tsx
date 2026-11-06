"use client";

import React, { useEffect, useState } from "react";
import { computeKpis, LeadItem } from "@/lib/leads";

export interface KpiStripProps {
  leads: LeadItem[];
}

export function KpiStrip({ leads }: KpiStripProps): React.ReactElement {
  const kpis = computeKpis(leads);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [displayMeanLoad, setDisplayMeanLoad] = useState<number | null>(null);
  const [displayChatbotPct, setDisplayChatbotPct] = useState(0);
  const [displayMarkets, setDisplayMarkets] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayTotal(kpis.total);
      setDisplayMeanLoad(kpis.meanLoadMs);
      setDisplayChatbotPct(kpis.withoutChatbotPct);
      setDisplayMarkets(kpis.markets);
      return;
    }

    const duration = 400;
    const startTime = performance.now();
    let animId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayTotal(Math.round(kpis.total * eased));
      setDisplayChatbotPct(Math.round(kpis.withoutChatbotPct * eased));
      setDisplayMarkets(Math.round(kpis.markets * eased));

      if (kpis.meanLoadMs !== null) {
        setDisplayMeanLoad(Math.round(kpis.meanLoadMs * eased));
      } else {
        setDisplayMeanLoad(null);
      }

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [kpis.total, kpis.meanLoadMs, kpis.withoutChatbotPct, kpis.markets]);

  return (
    <div className="w-full space-y-2">
      <div className="text-xs uppercase font-mono tracking-wider text-foreground/60 px-1">
        Across the leads shown
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="panel p-4 bg-surface border border-border">
          <div className="text-xs font-mono uppercase text-foreground/60 mb-1">
            Leads found
          </div>
          <div className="text-2xl font-semibold font-mono text-white tabular-nums">
            {displayTotal.toLocaleString()}
          </div>
        </div>

        {/* Mean Mobile Load */}
        <div className="panel p-4 bg-surface border border-border">
          <div className="text-xs font-mono uppercase text-foreground/60 mb-1">
            Mean mobile load
          </div>
          <div className="text-2xl font-semibold font-mono text-white tabular-nums">
            {displayMeanLoad !== null ? `${displayMeanLoad.toLocaleString()} ms` : "N/A"}
          </div>
        </div>

        {/* Share without Chatbot */}
        <div className="panel p-4 bg-surface border border-border">
          <div className="text-xs font-mono uppercase text-foreground/60 mb-1">
            Share without chatbot
          </div>
          <div className="text-2xl font-semibold font-mono text-white tabular-nums">
            {displayChatbotPct}%
          </div>
        </div>

        {/* Markets Covered */}
        <div className="panel p-4 bg-surface border border-border">
          <div className="text-xs font-mono uppercase text-foreground/60 mb-1">
            Markets covered
          </div>
          <div className="text-2xl font-semibold font-mono text-white tabular-nums">
            {displayMarkets}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KpiStrip;
