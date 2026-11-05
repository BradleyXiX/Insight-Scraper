"use client";

export default function HistoryPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Extraction history</h1>
        <p className="text-foreground/70">View and download your past lead extractions.</p>
      </div>

      <div className="panel p-12 text-center flex flex-col items-center justify-center min-h-64">
        <p className="text-foreground/60 font-mono text-sm">
          History is not available in this build.
        </p>
      </div>
    </div>
  );
}
