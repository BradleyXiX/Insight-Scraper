"use client";

import { Settings, Save, User, Building, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-zinc-400">Manage your account preferences and workspace settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <User className="w-4 h-4" /> Profile
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <Building className="w-4 h-4" /> Workspace
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <Shield className="w-4 h-4" /> Security
          </button>
        </div>

        <div className="md:col-span-3">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 backdrop-blur-sm space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Full Name</label>
                  <input type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Email Address</label>
                  <input type="email" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-500 cursor-not-allowed" value="testuser@example.com" disabled />
                  <p className="text-xs text-zinc-500">Email address cannot be changed here.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/50 flex justify-end">
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-[0_0_15px_-5px_rgba(79,70,229,0.4)]">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
