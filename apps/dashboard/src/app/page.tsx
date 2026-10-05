import Link from "next/link";
import { ArrowRight, Database, Shield, Zap } from "lucide-react";
import HeroScene from "@/components/HeroScene";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden flex flex-col selection:bg-primary-500/30">
      {/* 3D Background */}
      <HeroScene />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 w-full max-w-7xl mx-auto border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 flex items-center justify-center border border-primary-500 shadow-glow">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-display font-bold uppercase tracking-widest text-white">Foundry-SaaS</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm font-mono font-bold uppercase tracking-widest text-foreground/70 hover:text-primary-400 transition-colors">
            Auth
          </Link>
          <Link href="/dashboard" className="text-sm font-mono font-bold uppercase tracking-widest bg-white text-black px-6 py-3 border border-white hover:bg-zinc-200 transition-colors">
            Access System
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-8 pt-24 pb-24 flex-1 flex flex-col justify-center pointer-events-none">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-primary-500/10 border border-primary-500/50 text-primary-400 text-xs font-mono font-bold uppercase tracking-widest mb-12 shadow-glow w-fit">
          <span className="w-2 h-2 bg-primary-400 animate-pulse"></span>
          Enterprise B2B Extraction Engine Active
        </div>
        
        <h1 className="text-6xl md:text-8xl font-display font-extrabold tracking-tight mb-8 text-white uppercase leading-[0.9]">
          Extract High-Value <br />
          <span className="text-primary-400">Business Leads.</span>
        </h1>
        
        <p className="max-w-2xl text-lg md:text-xl font-mono text-foreground/70 mb-12 pointer-events-auto">
          Automate your prospecting workflow. Foundry-SaaS extracts, enriches, and organizes B2B directory data with unparalleled accuracy and scale.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6 pointer-events-auto w-fit">
          <Link href="/sign-up" className="flex items-center gap-3 px-8 py-5 bg-primary-600 text-white font-mono font-bold uppercase tracking-widest text-sm border border-primary-400 shadow-glow hover:bg-primary-500 transition-all">
            Initialize Sequence <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="#features" className="flex items-center gap-3 px-8 py-5 bg-surface text-foreground/70 font-mono font-bold uppercase tracking-widest text-sm border border-border hover:bg-surface-hover hover:text-white transition-all">
            View Schematics
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="relative z-10 w-full bg-surface border-t border-border">
        <div className="max-w-7xl mx-auto px-8 py-24">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="panel p-8 border-border hover:border-primary-500/50 transition-colors">
              <Zap className="w-10 h-10 text-primary-400 mb-6" />
              <h3 className="text-xl font-display font-bold uppercase tracking-wider text-white mb-3">Asynchronous Engine</h3>
              <p className="text-foreground/70 font-mono text-sm leading-relaxed">Powered by Playwright and FastAPI for maximum throughput and unthrottled execution.</p>
            </div>
            <div className="panel p-8 border-border hover:border-primary-500/50 transition-colors">
              <Shield className="w-10 h-10 text-primary-400 mb-6" />
              <h3 className="text-xl font-display font-bold uppercase tracking-wider text-white mb-3">Absolute Isolation</h3>
              <p className="text-foreground/70 font-mono text-sm leading-relaxed">Strict tenant isolation using PostgreSQL Row-Level Security ensures your data never leaks to unauthorized nodes.</p>
            </div>
            <div className="panel p-8 border-border hover:border-primary-500/50 transition-colors">
              <Database className="w-10 h-10 text-primary-400 mb-6" />
              <h3 className="text-xl font-display font-bold uppercase tracking-wider text-white mb-3">Structured Output</h3>
              <p className="text-foreground/70 font-mono text-sm leading-relaxed">Automatically clean and structure messy directory HTML into ready-to-use CSV or JSON schema exports.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
