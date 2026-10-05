"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, History, Settings, Database, CreditCard, Sparkles } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    return `group flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-300 border ${
      isActive 
        ? "bg-primary-600/10 text-primary-400 border-primary-500 shadow-glow" 
        : "text-foreground/50 border-transparent hover:text-foreground hover:bg-surface-hover hover:border-border"
    }`;
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col relative overflow-hidden shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border gap-3 bg-surface">
          <div className="w-8 h-8 bg-primary-600 flex items-center justify-center border border-primary-500 shadow-glow">
            <Database className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-white uppercase tracking-widest text-sm">
            Foundry-SaaS
          </span>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-8">
          <div>
            <div className="text-xs font-bold text-foreground/40 uppercase tracking-widest mb-3 px-4 font-mono">
              Menu
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard" className={getLinkClasses("/dashboard")}>
                <Search className="w-4 h-4" />
                New Extraction
              </Link>
              <Link href="/dashboard/history" className={getLinkClasses("/dashboard/history")}>
                <History className="w-4 h-4" />
                History
              </Link>
            </nav>
          </div>
          
          <div>
            <div className="text-xs font-bold text-foreground/40 uppercase tracking-widest mb-3 px-4 font-mono">
              Settings
            </div>
            <nav className="space-y-1">
              <Link href="/dashboard/billing" className={getLinkClasses("/dashboard/billing")}>
                <CreditCard className="w-4 h-4" />
                Billing & Plans
              </Link>
              <Link href="/dashboard/settings" className={getLinkClasses("/dashboard/settings")}>
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
        {/* Top Navigation */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-surface shrink-0 sticky top-0 z-50">
          <div className="flex items-center text-sm font-medium text-foreground/70 font-mono">
            <span className="bg-surface-hover px-3 py-1.5 border border-border flex items-center gap-2 uppercase tracking-widest text-xs font-bold">
              <Sparkles className="w-3 h-3 text-primary-400" />
              Pro Workspace
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="border border-border bg-surface-hover px-2 py-1 hover:bg-surface transition-colors">
              <OrganizationSwitcher 
                appearance={{
                  elements: {
                    organizationSwitcherTrigger: "text-foreground hover:text-primary-400 transition-colors focus:ring-0",
                    organizationPreviewTextContainer: "text-foreground font-mono font-bold",
                    organizationSwitcherTriggerIcon: "text-foreground/50",
                    avatarBox: "w-6 h-6",
                  }
                }}
              />
            </div>
            <div className="pl-6 border-l border-border flex items-center">
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8 border-2 border-border hover:border-primary-500 transition-colors rounded-none",
                  }
                }}
              />
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 relative scroll-smooth">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
