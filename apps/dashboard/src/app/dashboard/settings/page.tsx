"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="text-foreground/70">Manage your account preferences and workspace settings.</p>
      </div>

      <div className="panel p-12 text-center flex flex-col items-center justify-center min-h-64">
        <p className="text-foreground/60 font-mono text-sm">
          Settings are not available in this build.
        </p>
      </div>
    </div>
  );
}
