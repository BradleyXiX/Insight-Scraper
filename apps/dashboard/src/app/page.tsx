import Link from "next/link";
import { ArrowRight, Database, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Foundry-SaaS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/dashboard" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
          Now with Enterprise B2B Extraction
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
          Extract High-Value <br />
          Business Leads.
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-400 mb-12">
          Automate your prospecting workflow. Foundry-SaaS extracts, enriches, and organizes B2B directory data with unparalleled accuracy and scale.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/sign-up" className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-full font-semibold text-lg hover:bg-indigo-700 transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="#features" className="flex items-center gap-2 px-8 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-full font-semibold text-lg hover:bg-zinc-800 transition-all">
            View Features
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-zinc-800/50">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
            <Zap className="w-10 h-10 text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-zinc-400">Asynchronous scraping engine powered by Playwright and FastAPI for maximum throughput.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
            <Shield className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ironclad Security</h3>
            <p className="text-zinc-400">Strict tenant isolation using PostgreSQL Row-Level Security ensures your data never leaks.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
            <Database className="w-10 h-10 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Structured Data</h3>
            <p className="text-zinc-400">Automatically clean and structure messy directory HTML into ready-to-use CSV exports.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
