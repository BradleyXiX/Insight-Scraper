import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="w-full border-t border-border bg-surface text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Logo size={24} />
          <span className="text-xs text-foreground/50">
            Automated lead signals for sales teams
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
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
          <Link
            href="/sign-up"
            className="text-foreground/70 hover:text-white transition-colors"
          >
            Sign up
          </Link>
        </div>

        <div className="text-xs text-foreground/40 font-mono">
          &copy; {new Date().getFullYear()} Insight Scraper. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;

