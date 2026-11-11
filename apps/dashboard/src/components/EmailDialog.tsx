"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Mail, X } from "lucide-react";
import { getEmailBody, getEmailSubject, LeadItem } from "@/lib/leads";

export interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadItem | null;
}

export function EmailDialog({ isOpen, onClose, lead }: EmailDialogProps): React.ReactElement | null {
  const [copied, setCopied] = useState(false);
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        copyBtnRef.current?.focus();
      }, 40);

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
        triggerElementRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

  const subject = getEmailSubject(lead);
  const body = getEmailBody(lead);
  const businessName = lead.business_name || lead["Business Name"] || lead.name || "Business";

  const handleCopy = async () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="panel p-6 bg-surface border border-border w-full max-w-xl space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-accent" strokeWidth={1.5} />
              <h2 id="email-dialog-title" className="text-base font-semibold text-white">
                Outreach Email
              </h2>
            </div>
            <p className="text-xs font-mono text-foreground/60">{businessName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-foreground/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wider font-mono text-foreground/60">
            Subject
          </label>
          <div className="p-3 bg-surface border border-border text-white text-sm font-mono break-words select-all">
            {subject}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-1">
          <label className="block text-xs uppercase tracking-wider font-mono text-foreground/60">
            Body
          </label>
          <pre className="p-3 bg-surface border border-border text-foreground/90 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto select-all">
            {body}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-border text-foreground hover:text-white transition-colors text-xs font-mono uppercase tracking-wider"
          >
            Close
          </button>
          <button
            ref={copyBtnRef}
            type="button"
            onClick={() => void handleCopy()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-black font-semibold hover:bg-zinc-200 transition-colors text-xs font-mono uppercase tracking-wider"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                Copy email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailDialog;

