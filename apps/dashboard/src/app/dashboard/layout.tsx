import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, Search, History, Settings, Database } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/50 gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight">Foundry-SaaS</span>
        </div>
        
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-500/10 text-indigo-400">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </Link>
            <Link href="/dashboard/search" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
              <Search className="w-4 h-4" />
              New Extraction
            </Link>
            <Link href="/dashboard/history" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
              <History className="w-4 h-4" />
              History
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center text-sm text-zinc-400">
            {/* Breadcrumb or context could go here */}
            <span>Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <OrganizationSwitcher 
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "text-zinc-300 hover:text-white",
                  organizationPreviewTextContainer: "text-zinc-300"
                }
              }}
            />
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8 rounded-full border border-zinc-800"
                }
              }}
            />
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-zinc-950 p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
