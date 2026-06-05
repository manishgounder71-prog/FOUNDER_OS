"use client";

import React, { useState, useEffect } from "react";
import { User, Settings, Check, RefreshCw, Cpu } from "lucide-react";
import { saveMemory, searchMemory, MemoryHit } from "@/lib/api";

interface FounderPersonaProps {
  onRefreshTimeline?: () => void;
}

export default function FounderPersona({ onRefreshTimeline }: FounderPersonaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileText, setProfileText] = useState(
    "Founder Persona: Jane Doe. Core Focus: AI orchestration workflows, local-first markdown note-taking apps, Stripe subscription dynamic billing. Strategic Tendencies: Bootstrapping, low-CAC organic distribution, community-led growth (Reddit, Discord, HN). Preferred technologies: SQLite, Tailwind, Qdrant Vector DB, Gemini 1.5 Flash."
  );
  const [tempProfile, setTempProfile] = useState(profileText);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchProfile = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      // Semantic search for the seeded Founder Profile context
      const data = await searchMemory("Founder Persona", "startup_ideas");
      if (data && data["startup_ideas"] && data["startup_ideas"].length > 0) {
        // Find the profile record
        const hit = data["startup_ideas"].find((h: MemoryHit) => h.payload?.type === "Founder Profile");
        if (hit) {
          setProfileText(hit.payload.text || "");
          setTempProfile(hit.payload.text || "");
        }
      }
    } catch (err) {
      console.error("Failed to load founder profile from Qdrant:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load from Qdrant on mount
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProfile(false);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleSave = async () => {
    if (!tempProfile.trim()) return;
    setIsLoading(true);
    setStatusMsg("Encrypting and indexing to Qdrant...");
    try {
      // Save the updated profile to startup_ideas collection in Qdrant
      await saveMemory(
        "startup_ideas",
        tempProfile.trim(),
        {
          timestamp: new Date().toISOString(),
          type: "Founder Profile",
          startup_name: "General",
          author: "System",
          updated_at: new Date().toISOString()
        }
      );
      setProfileText(tempProfile);
      setIsEditing(false);
      setStatusMsg("Profile successfully updated in vector memory!");
      setTimeout(() => setStatusMsg(null), 3000);
      if (onRefreshTimeline) onRefreshTimeline();
    } catch (err) {
      console.error("Failed to save profile:", err);
      setStatusMsg("Failed to synchronize with Qdrant.");
      setTimeout(() => setStatusMsg(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse profile text into tags dynamically
  const getPreferences = () => {
    const defaultPrefs = {
      industries: ["SaaS", "Local-First", "EdTech"],
      strategy: ["Bootstrapping", "Organic GTM", "Community-Led"],
      tech: ["Qdrant", "FastAPI", "Next.js", "Lyzr"]
    };

    const text = profileText.toLowerCase();
    const prefs = { ...defaultPrefs };

    if (text.includes("ai orchestration")) prefs.tech.push("Agent Orchestration");
    if (text.includes("sqlite")) prefs.tech.push("SQLite");
    if (text.includes("stripe")) prefs.strategy.push("Dynamic Billing");
    if (text.includes("markdown")) prefs.industries.push("Productivity");

    // Deduplicate lists
    prefs.industries = Array.from(new Set(prefs.industries));
    prefs.strategy = Array.from(new Set(prefs.strategy));
    prefs.tech = Array.from(new Set(prefs.tech));

    return prefs;
  };

  const prefs = getPreferences();

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col h-full justify-between">
      {/* Background glow orb */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-gray-200 uppercase font-mono flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" /> Founder Persona Profile
          </h2>
          <p className="text-[10px] text-gray-500 uppercase mt-0.5">Persistent co-founder context & cognitive memory.</p>
        </div>
        
        <button
          onClick={() => {
            if (isEditing) {
              setTempProfile(profileText);
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
          disabled={isLoading}
          className="text-gray-500 hover:text-purple-400 transition-colors p-1"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-3 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={tempProfile}
              onChange={(e) => setTempProfile(e.target.value)}
              className="w-full bg-black/60 border border-purple-500/30 rounded-xl p-3 text-xs text-gray-200 focus:border-purple-400 outline-none h-[120px] font-mono leading-relaxed"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setTempProfile(profileText); setIsEditing(false); }}
                className="px-3 py-1.5 rounded-lg border border-gray-800 hover:bg-gray-900 text-[10px] font-mono text-gray-400 uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Raw profile text bubble */}
            <div className="bg-black/30 border border-gray-900/60 rounded-xl p-3 text-[11px] leading-relaxed text-gray-300 font-mono relative">
              <span className="text-purple-400 font-bold mr-1.5 font-mono">›</span>
              {profileText}
            </div>

            {/* Cognitive Tags */}
            <div className="grid grid-cols-1 gap-2.5">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-gray-600 block mb-1">Target Sectors</span>
                <div className="flex flex-wrap gap-1">
                  {prefs.industries.map((ind) => (
                    <span key={ind} className="text-[9px] font-mono uppercase tracking-wider bg-cyan-950/20 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-gray-600 block mb-1">Strategic Tendencies</span>
                <div className="flex flex-wrap gap-1">
                  {prefs.strategy.map((st) => (
                    <span key={st} className="text-[9px] font-mono uppercase tracking-wider bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      {st}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-gray-600 block mb-1">Core Tech Integration</span>
                <div className="flex flex-wrap gap-1">
                  {prefs.tech.map((tc) => (
                    <span key={tc} className="text-[9px] font-mono uppercase tracking-wider bg-purple-950/20 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md">
                      {tc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Status bar */}
      <div className="border-t border-gray-800/40 pt-2 flex items-center justify-between text-[9px] font-mono text-gray-600 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {isLoading ? (
            <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
          ) : (
            <Cpu className="w-3 h-3 text-purple-400" />
          )}
          <span>{statusMsg || "Cognitive Sync Active"}</span>
        </div>
        {!isEditing && (
          <button
            onClick={() => fetchProfile(true)}
            disabled={isLoading}
            className="hover:text-purple-400 transition-colors uppercase tracking-widest"
          >
            Fetch Sync
          </button>
        )}
      </div>
    </div>
  );
}
