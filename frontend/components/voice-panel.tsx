"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Radio, Play, AlertCircle, Zap, Search, CheckCircle, Edit3 } from "lucide-react";
import { transcribeAudio, simulateOmiWebhook } from "@/lib/api";

interface VoicePanelProps {
  onTriggerWorkflow: (workflowId: string, promptText: string) => void;
  onResearchQuery: (query: string) => void;
  isExecuting: boolean;
  isResearching: boolean;
}

const PRESET_PROMPTS = [
  "Create a launch strategy for an AI shopping app.",
  "Create a launch strategy for an AI study app.",
  "Research competitors for an AI note-taking app.",
  "Find market opportunities for a B2B SaaS pricing optimization dashboard.",
];

const STATUS_PHASES = [
  { key: "standby",      label: "STANDBY — Awaiting Command",         color: "text-gray-500" },
  { key: "listening",    label: "LISTENING — Voice Input Active",       color: "text-cyan-400" },
  { key: "transcribing", label: "TRANSCRIBING — Processing Speech...", color: "text-amber-400" },
  { key: "preview",      label: "PREVIEW — Confirm Your Command",       color: "text-emerald-400" },
  { key: "deploying",    label: "DEPLOYING — Agent Workforce Online",   color: "text-purple-400" },
  { key: "running",      label: "EXECUTING — Agents Running...",        color: "text-green-400" },
];

export default function VoicePanel({ onTriggerWorkflow, onResearchQuery, isExecuting, isResearching }: VoicePanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [phase, setPhase] = useState<string>("standby");
  const [statusMsg, setStatusMsg] = useState("Ready to receive commands...");
  const [selectedPreset, setSelectedPreset] = useState(PRESET_PROMPTS[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Transcript preview state — shown to user before deploying
  const [pendingTranscript, setPendingTranscript] = useState<string>("");
  const [editedTranscript, setEditedTranscript] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionTranscriptRef = useRef<string>("");

  const currentPhase = STATUS_PHASES.find(p => p.key === phase) ?? STATUS_PHASES[0];

  // Clean up audio nodes on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch (e) {} }
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    setPendingTranscript("");
    setEditedTranscript("");
    audioChunksRef.current = [];
    recognitionTranscriptRef.current = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = {};
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = { mimeType: "audio/webm" };
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          options = { mimeType: "audio/ogg" };
        }
      }
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Web Audio API Analyzer
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const normalized = Math.min(100, Math.floor((sum / dataArray.length / 150) * 100));
          setAudioLevel(normalized);
          animationFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      }

      // Browser Web Speech API — primary transcription method
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;      // Keep listening the whole recording duration
        recognition.interimResults = true;  // Capture partial results too
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let fullText = "";
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + " ";
          }
          recognitionTranscriptRef.current = fullText.trim();
          console.log("[WebSpeech] Interim transcript:", recognitionTranscriptRef.current);
        };

        recognition.onerror = (err: any) => {
          console.warn("[WebSpeech] Local speech error:", err.error);
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) { console.error("[WebSpeech] Recognition start failed:", e); }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setPhase("transcribing");
        setStatusMsg("Processing speech...");

        // Wait for Web Speech API to finalize
        await new Promise((resolve) => setTimeout(resolve, 1000));

        let transcript = recognitionTranscriptRef.current.trim();
        console.log("[Voice] Web Speech result:", transcript || "(empty)");

        // Only call backend Whisper if browser Speech API returned nothing
        if (!transcript) {
          try {
            setStatusMsg("Sending to Whisper API...");
            transcript = await transcribeAudio(audioBlob);
          } catch (err: any) {
            // Backend transcription failed — go to preview with empty text so user can type
            console.warn("[Voice] Backend transcription unavailable:", err.message);
            setPendingTranscript("");
            setEditedTranscript("");
            setPhase("preview");
            setStatusMsg("Voice not detected. Type your command below.");
            setError("Mic transcription unavailable. Type your command and click Deploy.");
            stream.getTracks().forEach(t => t.stop());
            return;
          }
        }

        if (!transcript || !transcript.trim()) {
          // Show editable preview so user can type their command
          setPendingTranscript("");
          setEditedTranscript("");
          setPhase("preview");
          setStatusMsg("Voice not detected. Type your command below.");
          setError("Could not detect speech. Type your command and click Deploy.");
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        // ✅ Show transcript preview — let user confirm before deploying
        setPendingTranscript(transcript);
        setEditedTranscript(transcript);
        setPhase("preview");
        setStatusMsg("Review your command before deploying.");
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setPhase("listening");
      setStatusMsg("Listening to voice input...");
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }
      if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
      if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
      setAudioLevel(0);
    }
  };

  const confirmAndDeploy = async () => {
    const text = editedTranscript.trim();
    if (!text) { setError("Command cannot be empty."); return; }
    setError(null);
    setPendingTranscript("");
    setEditedTranscript("");
    setPhase("deploying");
    setStatusMsg(`Dispatching: "${text}"`);
    try {
      const workflowId = await simulateOmiWebhook(text);
      setPhase("running");
      setStatusMsg("Workforce online. Streaming...");
      onTriggerWorkflow(workflowId, text);
    } catch {
      setError("Workflow dispatch failed. Please try again.");
      setPhase("standby");
      setStatusMsg("Ready to receive commands...");
    }
  };

  const cancelPreview = () => {
    setPendingTranscript("");
    setEditedTranscript("");
    setPhase("standby");
    setStatusMsg("Ready to receive commands...");
  };

  const handleOmiPush = async () => {
    setError(null);
    const textToPush = customPrompt.trim() || selectedPreset;
    if (!textToPush.trim()) { setError("Please select a preset or write a custom prompt."); return; }
    setPhase("deploying");
    setStatusMsg(`Dispatching: "${textToPush}"`);
    try {
      const workflowId = await simulateOmiWebhook(textToPush);
      setPhase("running");
      setStatusMsg("Workforce online. Streaming...");
      onTriggerWorkflow(workflowId, textToPush);
    } catch {
      setError("Omi webhook simulation failed.");
      setPhase("standby");
      setStatusMsg("Ready to receive commands...");
    }
  };

  const ringColor = isRecording
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
      {/* Background glow orbs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <motion.div animate={{ rotate: isRecording ? [0, 10, -10, 0] : 0 }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <Radio className="w-4 h-4 text-cyan-400" />
          </motion.div>
          <h2 className="text-sm font-bold tracking-widest text-gray-100 uppercase font-mono">Voice Command Center</h2>
        </div>
        <p className="text-[10px] text-gray-500 tracking-wide">Omi wearable integration — voice-first AI dispatch</p>
      </div>

      {/* Central mic visualizer */}
      <div className="flex flex-col items-center justify-center py-1 gap-2.5">
        <div className="relative flex items-center justify-center">
          {isRecording && (
            <>
              <div className="absolute w-24 h-24 rounded-full border border-cyan-400/30 neural-ring transition-all duration-75" style={{ transform: `scale(${1 + (audioLevel / 100) * 0.25})` }} />
              <div className="absolute w-24 h-24 rounded-full border border-cyan-400/20 neural-ring transition-all duration-75" style={{ transform: `scale(${1.15 + (audioLevel / 100) * 0.35})`, animationDelay: "0.6s" }} />
              <div className="absolute w-24 h-24 rounded-full border border-cyan-400/10 neural-ring transition-all duration-75" style={{ transform: `scale(${1.3 + (audioLevel / 100) * 0.45})`, animationDelay: "1.2s" }} />
            </>
          )}

          {isRecording ? (
            <div className={`w-16 h-16 rounded-full border-2 ${ringColor} flex items-center justify-center bg-black/50 transition-all duration-300`}>
              <div className="flex items-end gap-1 h-8 px-2">
                {[...Array(8)].map((_, i) => {
                  const multiplier = 0.25 + Math.sin((i / 7) * Math.PI) * 0.75;
                  const dynamicHeight = Math.max(4, Math.min(32, (audioLevel / 100) * 32 * multiplier + Math.random() * 4));
                  return (
                    <span key={i} className="wave-bar rounded-full transition-all duration-75" style={{ width: "3px", height: `${dynamicHeight}px`, background: `rgba(6, 182, 212, ${0.4 + i * 0.08})` }} />
                  );
                })}
              </div>
            </div>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} className={`w-16 h-16 rounded-full border-2 ${ringColor} flex items-center justify-center bg-black/50 transition-all duration-500`}>
              {isExecuting ? (
                <div className="relative"><Zap className="w-5 h-5 text-purple-400" /><div className="absolute inset-0 w-5 h-5 bg-purple-400/20 rounded-full blur-md" /></div>
              ) : phase === "preview" ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Mic className="w-5 h-5 text-gray-500" />
              )}
            </motion.div>
          )}
        </div>

        {/* Phase status */}
        <AnimatePresence mode="wait">
          <motion.div key={phase} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-center">
            <p className={`text-[10px] font-mono font-bold tracking-widest uppercase ${currentPhase.color}`}>{currentPhase.label}</p>
            <p className="text-[9px] text-gray-600 mt-0.5 font-mono max-w-[180px] truncate">{statusMsg}</p>
          </motion.div>
        </AnimatePresence>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 text-red-400 text-[10px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span className="font-mono">{error}</span>
          </motion.div>
        )}

        {/* ✅ Transcript Preview — confirm before deploying */}
        <AnimatePresence>
          {phase === "preview" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full px-1 space-y-1.5"
            >
              <p className="text-[9px] text-emerald-400 font-mono uppercase tracking-widest flex items-center gap-1">
                <Edit3 className="w-3 h-3" /> {pendingTranscript ? "Transcribed — edit if needed" : "Type your command below"}
              </p>
              <textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                rows={2}
                className="w-full glass-input rounded-lg p-1.5 text-[11px] outline-none resize-none leading-relaxed"
                placeholder="Type your command here, e.g. Create a launch strategy for an AI fitness app..."
              />
              <div className="flex gap-1.5">
                <motion.button
                  onClick={confirmAndDeploy}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 hover:from-emerald-500/25 hover:to-cyan-500/25 border border-emerald-500/40 text-emerald-300 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 font-mono"
                >
                  <Play className="w-3 h-3" /> Deploy
                </motion.button>
                <motion.button
                  onClick={cancelPreview}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-gray-400 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mic button — hidden during preview */}
        {phase !== "preview" && (
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isExecuting}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={`px-4 py-1.5 rounded-full font-bold text-[10px] tracking-widest uppercase transition-all duration-300 flex items-center gap-2 font-mono ${
              isRecording
                ? "bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300"
                : "bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 disabled:opacity-40"
            }`}
          >
            {isRecording ? <><MicOff className="w-3.5 h-3.5" /> Stop Recording</> : <><Mic className="w-3.5 h-3.5" /> Record Voice</>}
          </motion.button>
        )}
      </div>

      {/* Research Now inline button */}
      <AnimatePresence>
        {customPrompt.trim() && !isExecuting && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-1">
            <motion.button
              onClick={() => onResearchQuery(customPrompt.trim())}
              disabled={isResearching}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 hover:from-cyan-500/20 hover:to-emerald-500/20 border border-cyan-500/30 text-cyan-300 disabled:opacity-40 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 font-mono mb-2"
            >
              <Search className="w-3 h-3" />
              {isResearching ? "Researching Web..." : "Research Now — Real-Time Web"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Omi Webhook Simulator */}
      <div className="border-t border-gray-800/70 pt-2.5 space-y-1.5">
        <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-purple-400" /> Omi Webhook Simulator
        </h3>

        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-gray-600 uppercase tracking-widest">Preset Mission</label>
          <select
            value={selectedPreset}
            onChange={(e) => { setSelectedPreset(e.target.value); setCustomPrompt(""); }}
            className="bg-black/50 border border-gray-800 rounded-lg p-1.5 text-[11px] text-gray-300 outline-none focus:border-purple-500/50 transition-colors"
          >
            {selectedPreset === "" && <option value="" disabled>Custom active...</option>}
            {PRESET_PROMPTS.map((p, i) => (
              <option key={i} value={p}>{p.length > 48 ? p.slice(0, 45) + "..." : p}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-gray-600 uppercase tracking-widest">Custom Directive</label>
          <input
            type="text"
            placeholder="e.g. Build a fintech app strategy..."
            value={customPrompt}
            onChange={(e) => { setCustomPrompt(e.target.value); setSelectedPreset(""); }}
            className="glass-input rounded-lg p-1.5 text-[11px] outline-none"
          />
        </div>

        <motion.button
          onClick={handleOmiPush}
          disabled={isExecuting || isRecording || phase === "preview"}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-purple-500/10 to-cyan-500/10 hover:from-purple-500/20 hover:to-cyan-500/20 border border-purple-500/30 text-purple-300 disabled:opacity-40 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 font-mono"
        >
          <Play className="w-3 h-3" />
          {isExecuting ? "Agents Running..." : "Deploy AI Workforce"}
        </motion.button>
      </div>
    </motion.div>
  );
}
