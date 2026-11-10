"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Save } from "lucide-react";
import { useAppAuth } from "@/lib/app-auth";
import { NETWORK_FAILURE, readFailure } from "@/lib/errors";
import {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  REGION_OPTIONS,
  SOURCE_OPTIONS,
  type WorkspaceSettings,
} from "@/lib/jobs";

interface FullWorkspaceSettings extends WorkspaceSettings {
  sender_name?: string | null;
  sender_email?: string | null;
  sender_phone?: string | null;
}

export default function SettingsPage() {
  const { getToken } = useAppAuth();
  const [settings, setSettings] = useState<FullWorkspaceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await getSettings(getToken);
      if (!response.ok) {
        setError(await readFailure(response));
        return;
      }
      const loaded: WorkspaceSettings = await response.json();
      setSettings(loaded);
      setError(null);
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(null);
    setError(null);

    try {
      const response = await updateSettings(getToken, settings);
      if (!response.ok) {
        setError(await readFailure(response));
        return;
      }
      const updated: WorkspaceSettings = await response.json();
      setSettings(updated);
      setSaved("Defaults saved. New extractions will start with these values.");
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="heading-4 text-foreground">Settings</h1>
        <p className="text-foreground/70">
          Choose the starting values for a new extraction. Each run can still override them.
        </p>
      </div>

      {error && (
        <div className="panel p-4 bg-surface border border-danger/40 flex items-center gap-3">
          <span className="w-2 h-2 bg-danger inline-block shrink-0" aria-hidden="true" />
          <p className="text-danger font-mono text-xs">{error}</p>
        </div>
      )}

      {saved && (
        <div className="panel p-4 bg-surface border border-accent/40 flex items-center gap-3">
          <Check className="w-4 h-4 text-accent shrink-0" strokeWidth={1.5} />
          <p className="text-foreground/80 font-mono text-xs">{saved}</p>
        </div>
      )}

      <div className="panel p-6">
        {loading ? (
          <p className="text-foreground/60 font-mono text-sm">Loading workspace defaults…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            <div className="space-y-2">
              <label
                htmlFor="default-region"
                className="block text-xs uppercase tracking-wider font-mono text-foreground/60"
              >
                Default region
              </label>
              <div className="relative">
                <select
                  id="default-region"
                  value={settings.default_region}
                  onChange={(event) =>
                    setSettings({ ...settings, default_region: event.target.value })
                  }
                  className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
                >
                  {REGION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-surface text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="default-source"
                className="block text-xs uppercase tracking-wider font-mono text-foreground/60"
              >
                Default source
              </label>
              <div className="relative">
                <select
                  id="default-source"
                  value={settings.default_source}
                  onChange={(event) =>
                    setSettings({ ...settings, default_source: event.target.value })
                  }
                  className="w-full bg-surface border border-border rounded-none py-3 pl-4 pr-10 text-white focus:outline-none focus:border-accent font-mono text-sm cursor-pointer appearance-none"
                >
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-surface text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/50">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="default-limit"
                className="block text-xs uppercase tracking-wider font-mono text-foreground/60"
              >
                Default lead limit
              </label>
              <input
                id="default-limit"
                type="number"
                min={1}
                max={50}
                value={settings.default_limit}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    default_limit: Number(event.target.value) || 1,
                  })
                }
                className="w-full bg-surface border border-border rounded-none py-3 px-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm"
              />
              <p className="text-xs text-foreground/60">
                Between 1 and 50. Larger limits take longer and use more memory.
              </p>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-white">Outreach signature</h2>
                <p className="text-xs text-foreground/60 font-mono">
                  Used to sign generated outreach emails for extracted leads. Empty fields are omitted.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="sender-name"
                  className="block text-xs uppercase tracking-wider font-mono text-foreground/60"
                >
                  Sender name
                </label>
                <input
                  id="sender-name"
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={settings.sender_name ?? ""}
                  onChange={(event) =>
                    setSettings({ ...settings, sender_name: event.target.value })
                  }
                  className="w-full bg-surface border border-border rounded-none py-3 px-4 text-white placeholder:text-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="sender-email"
                  className="block text-xs uppercase tracking-wider font-mono text-foreground/60"
                >
                  Sender email
                </label>
                <input
                  id="sender-email"
                  type="email"
                  placeholder="e.g. alex@foundrygrowth.com"
                  value={settings.sender_email ?? ""}
                  onChange={(event) =>
                    setSettings({ ...settings, sender_email: event.target.value })
                  }
                  className="w-full bg-surface border border-border rounded-none py-3 px-4 text-white placeholder:text-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="sender-phone"
                  className="block text-xs uppercase tracking-wider font-mono text-foreground/60"
                >
                  Sender phone
                </label>
                <input
                  id="sender-phone"
                  type="tel"
                  placeholder="e.g. +1 (555) 234-5678"
                  value={settings.sender_phone ?? ""}
                  onChange={(event) =>
                    setSettings({ ...settings, sender_phone: event.target.value })
                  }
                  className="w-full bg-surface border border-border rounded-none py-3 px-4 text-white placeholder:text-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-white text-black border border-transparent px-6 py-3 rounded-none font-semibold enabled:hover:bg-zinc-200 disabled:bg-surface-hover disabled:text-foreground/60 disabled:border-border disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save defaults"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
