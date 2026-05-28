"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Play, Search, Headphones, AlertCircle } from "lucide-react";
import { simulateOmiWebhook } from "@/lib/api";

interface VoicePanelProps {
  onTriggerWorkflow: (workflowId: string, promptText: string) => void;
  onResearchQuery: (query: string) => void;
  isExecuting: boolean;
  isResearching: boolean;
}

const PRESETS = [
  "Create a launch strategy for an AI shopping app.",
  "Create a launch strategy for an AI study app.",
  "Research competitors for an AI note-taking app.",
  "Find market opportunities for a B2B SaaS pricing optimization dashboard.",
];

export default function VoicePanel({ onTriggerWorkflow, onResearchQuery, isExecuting, isResearching }: VoicePanelProps) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready to receive commands...");

  const deploy = async () => {
    setError(null);
    const text = prompt.trim() || preset;
    if (!text.trim()) { setError("Type or select a command first."); return; }
    setStatus(`Dispatching: "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"`);
    try {
      const id = await simulateOmiWebhook(text);
      setStatus("Workforce online. Streaming...");
      onTriggerWorkflow(id, text);
    } catch {
      setError("Workflow dispatch failed.");
      setStatus("Ready to receive commands...");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-2xl p-4 py-3.5 relative overflow-hidden flex flex-col h-full justify-between hud-border"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Headphones className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-widest text-gray-100 uppercase font-mono">Omi Voice Intake</h2>
        </div>
        <p className="text-[10px] text-gray-500 tracking-wide">
          Real Omi device &nbsp;|&nbsp; Text simulation
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-1 gap-2.5">
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[9px] font-mono text-green-300 uppercase tracking-wider font-bold">Omi Ready</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={String(isExecuting)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-center">
            <p className={`text-[10px] font-mono font-bold tracking-widest uppercase ${isExecuting ? "text-purple-400" : "text-gray-500"}`}>
              {isExecuting ? "EXECUTING" : "STANDBY"}
            </p>
            <p className="text-[9px] text-gray-600 mt-0.5 font-mono truncate max-w-[200px]">{status}</p>
          </motion.div>
        </AnimatePresence>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 text-red-400 text-[10px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span className="font-mono">{error}</span>
          </motion.div>
        )}

        <AnimatePresence>
          {prompt.trim() && !isExecuting && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full">
              <motion.button
                onClick={() => onResearchQuery(prompt.trim())}
                disabled={isResearching}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 hover:from-cyan-500/20 hover:to-emerald-500/20 border border-cyan-500/30 text-cyan-300 disabled:opacity-40 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 font-mono"
              >
                <Search className="w-3 h-3" />
                {isResearching ? "Searching..." : "Search Web Now"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-gray-800/70 pt-2.5 space-y-1.5">
        <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-purple-400" /> Command Input
        </h3>

        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-gray-600 uppercase tracking-widest">Preset</label>
          <select
            value={preset}
            onChange={(e) => { setPreset(e.target.value); setPrompt(""); }}
            className="bg-black/50 border border-gray-800 rounded-lg p-1.5 text-[11px] text-gray-300 outline-none focus:border-purple-500/50"
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={p}>{p.length > 48 ? p.slice(0, 45) + "..." : p}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-gray-600 uppercase tracking-widest">Custom / Result</label>
          <input
            type="text"
            placeholder="Type or speak into Omi device..."
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setPreset(""); }}
            className="glass-input rounded-lg p-1.5 text-[11px] outline-none"
          />
        </div>

        <motion.button
          onClick={deploy}
          disabled={isExecuting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-purple-500/10 to-cyan-500/10 hover:from-purple-500/20 hover:to-cyan-500/20 border border-purple-500/30 text-purple-300 disabled:opacity-40 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 font-mono"
        >
          <Play className="w-3 h-3" />
          {isExecuting ? "Agents Running..." : "Deploy AI Workforce"}
        </motion.button>
      </div>
    </motion.div>
  );
}
