"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Radio, Play, AlertCircle, Zap, Search } from "lucide-react";
import { simulateOmiWebhook, transcribeAudio } from "@/lib/api";

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

const STATUS = [
  { key: "idle",   label: "STANDBY",         color: "text-gray-500" },
  { key: "deploy", label: "DEPLOYING",        color: "text-purple-400" },
  { key: "run",    label: "EXECUTING",        color: "text-green-400" },
];

export default function VoicePanel({ onTriggerWorkflow, onResearchQuery, isExecuting, isResearching }: VoicePanelProps) {
  const [recording, setRecording] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [status, setStatus] = useState("Ready to receive commands...");
  const [preset, setPreset] = useState(PRESETS[0]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  React.useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    audioChunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/wav"
      });

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: mr.mimeType });
        setStatus("Transcribing via Gemini...");
        try {
          const text = await transcribeAudio(blob);
          if (text) {
            setPrompt(text);
            setStatus(`Ready: "${text.slice(0, 60)}${text.length > 60 ? "..." : ""}"`);
          } else {
            setStatus("No speech detected. Type your command.");
          }
        } catch {
          setError("Transcription failed. Gemini may not be available. Type your command.");
          setStatus("Ready to receive commands...");
        }
        setRecording(false);
      };

      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
      setStatus("Recording... speak now.");
    } catch {
      setError("Microphone access blocked or no mic found.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      mediaRecorder.current = null;
    }
  };

  const deploy = async () => {
    setError(null);
    const text = prompt.trim() || preset;
    if (!text.trim()) { setError("Type or speak a command first."); return; }
    setPhase("deploy");
    setStatus(`Dispatching: "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"`);
    try {
      const id = await simulateOmiWebhook(text);
      setPhase("run");
      setStatus("Workforce online. Streaming...");
      onTriggerWorkflow(id, text);
    } catch {
      setError("Workflow dispatch failed.");
      setPhase("idle");
      setStatus("Ready to receive commands...");
    }
  };

  const ringColor = recording
    ? "border-cyan-400 shadow-[0_0_30px_rgba(0,212,255,0.4)]"
    : isExecuting
    ? "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-pulse"
    : "border-gray-800";

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
          <motion.div animate={{ rotate: recording ? [0, 10, -10, 0] : 0 }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <Radio className="w-4 h-4 text-cyan-400" />
          </motion.div>
          <h2 className="text-sm font-bold tracking-widest text-gray-100 uppercase font-mono">Voice Command Center</h2>
        </div>
        <p className="text-[10px] text-gray-500 tracking-wide">Speak or type — text goes to the search box below</p>
      </div>

      <div className="flex flex-col items-center justify-center py-1 gap-2.5">
        <div className="relative flex items-center justify-center">
          {recording && (
            <>
              <div className="absolute w-24 h-24 rounded-full border border-cyan-400/30 neural-ring animate-pulse" />
              <div className="absolute w-24 h-24 rounded-full border border-cyan-400/20 neural-ring animate-pulse" style={{ animationDelay: "0.3s", transform: "scale(1.15)" }} />
              <div className="absolute w-24 h-24 rounded-full border border-cyan-400/10 neural-ring animate-pulse" style={{ animationDelay: "0.6s", transform: "scale(1.3)" }} />
            </>
          )}

          {recording ? (
            <div className={`w-16 h-16 rounded-full border-2 ${ringColor} flex items-center justify-center bg-black/50`}>
              <div className="flex items-end gap-0.5 h-7 px-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="w-1 rounded-full bg-cyan-400 animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} className={`w-16 h-16 rounded-full border-2 ${ringColor} flex items-center justify-center bg-black/50`}>
              {isExecuting ? (
                <div className="relative"><Zap className="w-5 h-5 text-purple-400" /><div className="absolute inset-0 bg-purple-400/20 rounded-full blur-md" /></div>
              ) : (
                <Mic className="w-5 h-5 text-gray-500" />
              )}
            </motion.div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={phase + String(recording)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-center">
            <p className={`text-[10px] font-mono font-bold tracking-widest uppercase ${recording ? "text-cyan-400" : "text-gray-500"}`}>
              {recording ? "RECORDING — Speak Now" : "STANDBY"}
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

        <motion.button
          onClick={recording ? stopRecording : startRecording}
          disabled={isExecuting}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className={`px-4 py-1.5 rounded-full font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 font-mono transition-all ${
            recording
              ? "bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300"
              : "bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 disabled:opacity-40"
          }`}
        >
          {recording ? <><MicOff className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Speak</>}
        </motion.button>
      </div>

      <AnimatePresence>
        {prompt.trim() && !isExecuting && !recording && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-1">
            <motion.button
              onClick={() => onResearchQuery(prompt.trim())}
              disabled={isResearching}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 hover:from-cyan-500/20 hover:to-emerald-500/20 border border-cyan-500/30 text-cyan-300 disabled:opacity-40 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 font-mono mb-2"
            >
              <Search className="w-3 h-3" />
              {isResearching ? "Searching..." : "Search Web Now"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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
          <label className="text-[9px] text-gray-600 uppercase tracking-widest">Custom Search / Command</label>
          <input
            type="text"
            placeholder="Speak or type here..."
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setPreset(""); }}
            className="glass-input rounded-lg p-1.5 text-[11px] outline-none"
          />
        </div>

        <motion.button
          onClick={deploy}
          disabled={isExecuting || recording}
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
