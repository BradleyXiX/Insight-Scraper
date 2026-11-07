"use client";

import React, { useEffect, useRef, useState } from "react";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { Menu, X, Sparkles, Terminal } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SidebarNav } from "@/components/SidebarNav";
import { useAppAuth } from "@/lib/app-auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { isLocal, operatorLabel } = useAppAuth();

  // Close drawer on Escape key and restore focus to menu button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Skip link as first focusable element */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:font-semibold focus:outline-none"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar (visible at lg and above) */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-surface flex-col shrink-0 relative overflow-hidden">
        <div className="h-16 flex items-center px-6 border-b border-border gap-3 bg-surface">
          <Logo size={24} />
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile Drawer Backdrop (below lg) */}
      <div
        onClick={() => {
          setDrawerOpen(false);
          menuButtonRef.current?.focus();
        }}
        className={`fixed inset-0 bg-black/70 z-40 lg:hidden ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{
          transition: "opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        aria-hidden="true"
      />

      {/* Mobile Slide-over Drawer Panel (below lg) */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-full bg-surface border-r border-border z-50 lg:hidden flex flex-col p-6 shadow-2xl ${
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
          <Logo size={24} />
          <button
            onClick={() => {
              setDrawerOpen(false);
              menuButtonRef.current?.focus();
            }}
            aria-label="Close navigation"
            className="p-1.5 border border-border bg-surface hover:bg-surface-hover text-foreground hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav
            stagger={true}
            onNavigate={() => {
              setDrawerOpen(false);
              menuButtonRef.current?.focus();
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-border bg-surface shrink-0 z-30">
          <div className="flex items-center">
            {/* Mobile Menu Toggle Button (below lg) */}
            <button
              ref={menuButtonRef}
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-expanded={drawerOpen}
              aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
              className="lg:hidden p-2 border border-border bg-surface hover:bg-surface-hover text-foreground hover:text-white transition-colors cursor-pointer mr-3"
            >
              <div
                style={{
                  transform: drawerOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {drawerOpen ? (
                  <X className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Menu className="w-5 h-5" strokeWidth={1.5} />
                )}
              </div>
            </button>

            {/* Workspace status badge */}
            <div className="flex items-center text-xs font-mono font-medium text-foreground/70">
              <span className="px-2.5 py-1 bg-surface-hover border border-border flex items-center gap-2 uppercase tracking-wider">
                {isLocal ? (
                  <Terminal className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.5} />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.5} />
                )}
                <span>{operatorLabel}</span>
              </span>
            </div>
          </div>

          {/* User & Org Controls */}
          {isLocal ? (
            <span className="hidden sm:flex items-center gap-3 text-xs font-mono text-foreground/60">
              No sign-in required
              <span className="w-2 h-2 bg-accent inline-block" aria-hidden="true" />
            </span>
          ) : (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="border border-border bg-surface-hover px-2 py-1 hover:bg-surface transition-colors">
                <OrganizationSwitcher
                  appearance={{
                    elements: {
                      organizationSwitcherTrigger:
                        "text-foreground hover:text-accent transition-colors focus:ring-0 rounded-none",
                      organizationPreviewTextContainer:
                        "text-foreground font-mono font-medium",
                      organizationSwitcherTriggerIcon: "text-foreground/60",
                      avatarBox: "w-6 h-6 rounded-none",
                    },
                  }}
                />
              </div>
              <div className="pl-4 sm:pl-6 border-l border-border flex items-center">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox:
                        "w-8 h-8 border border-border hover:border-accent transition-colors rounded-none",
                    },
                  }}
                />
              </div>
            </div>
          )}
        </header>

        {/* Scrolling Content targeted by skip link */}
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 outline-none"
        >
          <div className="max-w-6xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
