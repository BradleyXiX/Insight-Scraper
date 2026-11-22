import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CONTACT_CHANNELS, OPERATOR_CONTACT } from "@/lib/contact";

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="w-full border-t border-border bg-surface text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Logo size={24} />
            <span className="text-xs text-foreground/50">
              Automated lead signals for sales teams
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/demo"
              className="text-foreground/70 hover:text-white transition-colors"
            >
              Sample output
            </Link>
            <Link
              href="/pricing"
              className="text-foreground/70 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="text-foreground/70 hover:text-white transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2">
            <span className="font-mono uppercase tracking-wider text-foreground/40">
              Built by {OPERATOR_CONTACT.name}
            </span>
            {CONTACT_CHANNELS.map((channel) => (
              <a
                key={channel.id}
                href={channel.href}
                target={channel.external ? "_blank" : undefined}
                rel={channel.external ? "noopener noreferrer" : undefined}
                className="text-foreground/70 hover:text-accent transition-colors font-mono"
              >
                {channel.label}
              </a>
            ))}
          </div>

          <div className="text-foreground/40 font-mono">
            &copy; {new Date().getFullYear()} Insight Scraper. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;

