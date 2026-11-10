"use client";

import React from "react";
import { ExternalLink, Bot, Zap, CheckCircle } from "lucide-react";
import {
  LeadItem,
  getPitchHook,
  getMobileLoadMs,
  getHasChatbot,
  getPitchRank,
  pitchTone,
  sortByPitch,
} from "@/lib/leads";

export interface LeadResultsProps {
  leads: LeadItem[];
  region: string;
  /** Copy for the empty table, so the message matches what actually happened. */
  emptyMessage?: string;
}

/** Compact display label; the full pitch string is kept in exports and the title. */
function pitchLabel(pitch: string, rank?: number | null): string {
  if (rank === 1) return "Speed overhaul";
  if (rank === 2) return "No HTTPS";
  if (rank === 3) return "RAG bot";
  if (rank === 4) return "No website";
  if (rank === 5) return "SEO / Content";

  if (/speed/i.test(pitch) || /load/i.test(pitch)) return "Speed overhaul";
  if (/https|not secure/i.test(pitch)) return "No HTTPS";
  if (/rag|bot|after hours/i.test(pitch)) return "RAG bot";
  if (/no site|directory/i.test(pitch)) return "No website";
  if (/seo|content|decent shape/i.test(pitch)) return "SEO / Content";
  return "AI automation";
}

export function LeadResults({ leads, region, emptyMessage }: LeadResultsProps): React.ReactElement {
  if (leads.length === 0) {
    return (
      <div className="panel p-12 text-center text-foreground/60 font-mono text-sm">
        {emptyMessage ??
          "No leads found for this search. Try a broader search term or different region."}
      </div>
    );
  }

  const sortedLeads = sortByPitch(leads);

  return (
    <>
      <style>{`
        @keyframes leadRowEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lead-row-stagger {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Desktop / Tablet Table at lg and above */}
      <div className="panel overflow-x-auto hidden lg:block">
        <table className="w-full table-fixed text-sm text-left">
          <thead className="text-xs text-foreground/60 uppercase bg-surface border-b border-border">
            <tr>
              <th className="w-56 px-5 py-4 font-medium">Business Name</th>
              <th className="w-56 px-5 py-4 font-medium">Contact &amp; Phone</th>
              <th className="w-56 px-5 py-4 font-medium">Website</th>
              <th className="w-24 px-4 py-4 font-medium text-center">Mobile Load</th>
              <th className="w-28 px-4 py-4 font-medium text-center">Chatbot</th>
              <th className="w-44 px-5 py-4 font-medium">Pitch Hook</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedLeads.map((lead, index) => {
              const rank = getPitchRank(lead);
              const pitch = getPitchHook(lead);
              const tone = pitchTone(pitch, rank);
              const loadMs = getMobileLoadMs(lead);
              const hasChatbot = getHasChatbot(lead);
              const reg = lead.region || lead["Region"] || region;
              const leadName = lead.business_name || lead["Business Name"] || lead.name || "Unknown Business";
              const phone = lead.phone || lead["Phone"] || lead.contact || lead["Contact"] || "Hidden";
              const email = lead.email || lead["Email"];
              const website = lead.website || lead["Website"];
              const delay = Math.min(index, 12) * 40;

              return (
                <tr
                  key={lead.id ?? index}
                  className="hover:bg-surface-hover transition-colors lead-row-stagger"
                  style={{
                    animation: `leadRowEnter 300ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
                  }}
                >
                  {/* Business Name + Region */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 bg-surface border border-border text-foreground/60 font-mono uppercase">
                        {reg}
                      </span>
                      <span className="font-medium text-white">{leadName}</span>
                    </div>
                  </td>

                  {/* Contact & Phone */}
                  <td className="px-5 py-4 text-foreground/80 font-mono text-xs">
                    <div>{phone}</div>
                    {email && email !== "N/A" && (
                      <div className="text-foreground/60 text-xs truncate max-w-xs">{email}</div>
                    )}
                  </td>

                  {/* Website */}
                  <td className="px-5 py-4">
                    {website ? (
                      <a
                        href={website.startsWith("http") ? website : `https://${website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline max-w-full"
                      >
                        <span className="truncate">{website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      </a>
                    ) : (
                      <span className="text-foreground/60 font-mono text-xs">No website</span>
                    )}
                  </td>

                  {/* Mobile Load Time (ms) */}
                  <td className="px-4 py-4 text-center">
                    {loadMs > 0 ? (
                      loadMs > 3000 ? (
                        <span className="font-mono text-xs text-attention font-medium tabular-nums">
                          {loadMs.toLocaleString()} ms
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-white tabular-nums">
                          {loadMs.toLocaleString()} ms
                        </span>
                      )
                    ) : (
                      <span className="text-foreground/60 font-mono text-xs">N/A</span>
                    )}
                  </td>

                  {/* Chatbot Widget Status */}
                  <td className="px-4 py-4 text-center">
                    {hasChatbot ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-surface border border-border text-foreground/70">
                        <Bot className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-accent-quiet text-accent border border-accent/40">
                        None
                      </span>
                    )}
                  </td>

                  {/* Pitch Hook Badge Column */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {rank !== null && (
                        <span className="text-xs px-1.5 py-0.5 bg-surface border border-border text-foreground/60 font-mono font-medium shrink-0">
                          #{rank}
                        </span>
                      )}
                      {tone === "attention" ? (
                        <span
                          title={pitch}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-attention bg-attention-quiet border border-attention/30 whitespace-nowrap"
                        >
                          <Zap className="w-3.5 h-3.5 text-attention shrink-0" strokeWidth={1.5} />
                          {pitchLabel(pitch, rank)}
                        </span>
                      ) : tone === "accent" ? (
                        <span
                          title={pitch}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-accent bg-accent-quiet border border-accent/30 whitespace-nowrap"
                        >
                          <Bot className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.5} />
                          {pitchLabel(pitch, rank)}
                        </span>
                      ) : (
                        <span
                          title={pitch}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-foreground/80 bg-surface border border-border whitespace-nowrap"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                          {pitchLabel(pitch, rank)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List below lg */}
      <ul className="lg:hidden space-y-3 list-none p-0 m-0">
        {sortedLeads.map((lead, index) => {
          const pitch = getPitchHook(lead);
          const rank = getPitchRank(lead);
          const tone = pitchTone(pitch, rank);
          const loadMs = getMobileLoadMs(lead);
          const hasChatbot = getHasChatbot(lead);
          const reg = lead.region || lead["Region"] || region;
          const leadName = lead.business_name || lead["Business Name"] || lead.name || "Unknown Business";
          const phone = lead.phone || lead["Phone"] || lead.contact || lead["Contact"] || "Hidden";
          const email = lead.email || lead["Email"];
          const website = lead.website || lead["Website"];
          const delay = Math.min(index, 12) * 40;

          return (
            <li
              key={lead.id ?? index}
              className="panel p-4 bg-surface border border-border space-y-3 lead-row-stagger"
              style={{
                animation: `leadRowEnter 300ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
              }}
            >
              {/* Header: Name and Region */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-white break-words text-base leading-snug">
                  {leadName}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-surface border border-border text-foreground/70 font-mono uppercase shrink-0">
                  {reg}
                </span>
              </div>

              {/* Contact & Phone */}
              <div className="space-y-0.5 text-xs font-mono">
                <div className="text-foreground/60 uppercase tracking-wider text-xs">Contact</div>
                <div className="text-foreground/90">{phone}</div>
                {email && email !== "N/A" && (
                  <div className="text-foreground/60 break-all">{email}</div>
                )}
              </div>

              {/* Two-Column Signal Grid: Mobile Load & Chatbot */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                {/* Mobile Load */}
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-foreground/60 mb-1">
                    Mobile load
                  </div>
                  {loadMs > 0 ? (
                    loadMs > 3000 ? (
                      <span className="font-mono text-xs text-attention font-medium tabular-nums">
                        {loadMs.toLocaleString()} ms (slow)
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-white tabular-nums">
                        {loadMs.toLocaleString()} ms
                      </span>
                    )
                  ) : (
                    <span className="font-mono text-xs text-foreground/60">N/A</span>
                  )}
                </div>

                {/* Chatbot */}
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-foreground/60 mb-1">
                    Chatbot
                  </div>
                  {hasChatbot ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-surface border border-border text-foreground/70">
                      <Bot className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-accent-quiet text-accent border border-accent/40">
                      None
                    </span>
                  )}
                </div>
              </div>

              {/* Pitch Hook */}
              <div className="pt-1 border-t border-border">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-foreground/60 mb-1">
                  <span>Pitch hook</span>
                  {rank !== null && (
                    <span className="text-foreground/50">Rank #{rank}</span>
                  )}
                </div>
                {tone === "attention" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-attention bg-attention-quiet border border-attention/30 break-words">
                    <Zap className="w-3.5 h-3.5 text-attention shrink-0" strokeWidth={1.5} />
                    {pitch}
                  </span>
                ) : tone === "accent" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-accent bg-accent-quiet border border-accent/30 break-words">
                    <Bot className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.5} />
                    {pitch}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-foreground/80 bg-surface border border-border break-words">
                    <CheckCircle className="w-3.5 h-3.5 text-foreground/70 shrink-0" strokeWidth={1.5} />
                    {pitch}
                  </span>
                )}
              </div>

              {/* Website */}
              <div className="pt-1 border-t border-border flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-wider text-foreground/60">Website</span>
                {website ? (
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline font-mono break-all"
                  >
                    <span className="break-all">{website.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                  </a>
                ) : (
                  <span className="text-foreground/60 font-mono">No website</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default LeadResults;

