import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, Search, History, Settings, Database, CreditCard, Sparkles } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-zinc-50 selection:bg-indigo-500/30 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-2xl flex flex-col relative overflow-hidden">
        {/* Subtle decorative glow in sidebar */}
        <div className="absolute top-0 left-0 w-full h-32 bg-indigo-500/10 blur-[50px] -z-10 rounded-full" />
        
        <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <Database className="w-4 h-4 text-white drop-shadow-sm" />
          </div>
          <span className="font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Foundry-SaaS
          </span>
        </div>
        
        <div className="p-4 flex-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-3">
            Menu
          </div>
          <nav className="space-y-1">
            <Link href="/dashboard" className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl bg-white/5 text-indigo-300 ring-1 ring-white/10 hover:bg-white/10 transition-all duration-300">
              <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
              Overview
            </Link>
            <Link href="/dashboard/search" className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-300">
              <Search className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
              New Extraction
            </Link>
            <Link href="/dashboard/history" className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-300">
              <History className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
              History
            </Link>
          </nav>
          
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-8 mb-3 px-3">
            Settings
          </div>
          <nav className="space-y-1">
            <Link href="/dashboard/billing" className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-300 relative overflow-hidden">
              <CreditCard className="w-4 h-4 group-hover:text-indigo-400 transition-colors z-10" />
              <span className="z-10">Billing & Plans</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </Link>
            <Link href="/dashboard/settings" className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-300">
              <Settings className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        
        {/* Top Navigation */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 backdrop-blur-xl shrink-0 sticky top-0 z-50">
          <div className="flex items-center text-sm font-medium text-zinc-400">
            <span className="bg-white/5 px-3 py-1 rounded-full ring-1 ring-white/10 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Pro Workspace
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="ring-1 ring-white/10 rounded-xl bg-white/5 px-2 py-1 hover:bg-white/10 transition-colors">
              <OrganizationSwitcher 
                appearance={{
                  elements: {
                    organizationSwitcherTrigger: "text-zinc-300 hover:text-white transition-colors focus:ring-0",
                    organizationPreviewTextContainer: "text-zinc-200 font-medium",
                    organizationSwitcherTriggerIcon: "text-zinc-400",
                    avatarBox: "w-6 h-6 rounded-md",
                  }
                }}
              />
            </div>
            <div className="pl-6 border-l border-white/10 flex items-center">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8 rounded-full border border-white/20 shadow-sm hover:scale-105 transition-transform",
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
