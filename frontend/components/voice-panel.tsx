"use client";

import React, { useState, useRef } from "react";
import { Mic, MicOff, Radio, Play, AlertCircle } from "lucide-react";
import { transcribeAudio, simulateOmiWebhook } from "@/lib/api";

interface VoicePanelProps {
  onTriggerWorkflow: (workflowId: string, promptText: string) => void;
  isExecuting: boolean;
}

const PRESET_PROMPTS = [
  "Create a launch strategy for an AI study app.",
  "Research competitors for an AI note-taking app.",
  "Find market opportunities for a B2B SaaS pricing optimization dashboard.",
  "Summarize today's startup tasks."
];

export default function VoicePanel({ onTriggerWorkflow, isExecuting }: VoicePanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>("Ready to receive commands...");
  const [selectedPreset, setSelectedPreset] = useState(PRESET_PROMPTS[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Start browser audio recording
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setStatus("Transcribing audio via Whisper...");
        
        try {
          // Since browser may record empty/noisy audio on VM or Windows servers without mic,
          // we send a helpful test fallback if transcription fails, or user can use Omi simulation.
          const transcript = await transcribeAudio(audioBlob);
          setStatus(`Transcribed: "${transcript}"`);
          setError(null);
          
          // Trigger the workflow
          setStatus("Launching Multi-Agent team...");
          const res = await simulateOmiWebhook(transcript);
          onTriggerWorkflow(res, transcript);
        } catch (err: any) {
          setError("Transcription failed. Try using Omi Webhook Simulator.");
          setStatus("Error during transcription.");
        }
        
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus("Listening to voice input...");
    } catch (err: any) {
      setError("Microphone access denied or unavailable.");
    }
  };

  // Stop browser audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Triggers Omi simulated webhook
  const handleOmiPush = async () => {
    setError(null);
    const textToPush = customPrompt.trim() || selectedPreset;
    setStatus(`Simulating Omi push: "${textToPush}"`);
    
    try {
      const workflowId = await simulateOmiWebhook(textToPush);
      setStatus("Omi push webhook success. Streaming workflow...");
      onTriggerWorkflow(workflowId, textToPush);
    } catch (err: any) {
      setError("Omi webhook simulation failed.");
      setStatus("Failed to trigger webhook.");
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col h-full justify-between">
      {/* Background glow orb */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-lg font-semibold tracking-wide text-gray-100 uppercase">Voice Intake Controller</h2>
        </div>
        <p className="text-xs text-gray-400">Pushes transcriptions via Omi wearable API integration.</p>
      </div>

      {/* Visual wave/mic action area */}
      <div className="my-2.5 flex flex-col items-center justify-center">
        {isRecording ? (
          <div className="flex items-center justify-center gap-1.5 h-14 mb-3">
            {[...Array(7)].map((_, i) => (
              <span key={i} className="wave-bar w-1.5 bg-cyan-400 rounded-full" style={{ height: "30px" }} />
            ))}
          </div>
        ) : (
          <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-gray-900 border transition-all duration-300 ${isExecuting ? 'border-purple-500/40 animate-pulse' : 'border-gray-800'}`}>
            {isExecuting ? (
              <Radio className="w-5.5 h-5.5 text-purple-400" />
            ) : (
              <Mic className="w-5.5 h-5.5 text-gray-400" />
            )}
          </div>
        )}

        <div className="text-center mt-1.5">
          <p className={`text-xs font-mono ${isRecording ? 'text-cyan-400 animate-pulse' : 'text-gray-300'}`}>
            {status}
          </p>
          {error && (
            <div className="flex items-center gap-1 text-red-400 text-[10px] justify-center mt-1">
              <AlertCircle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Microphone toggle */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isExecuting}
          className={`mt-2.5 px-5 py-1.5 rounded-full font-semibold text-[10px] tracking-wider uppercase transition-all duration-300 flex items-center gap-2 ${
            isRecording 
              ? "bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200" 
              : "bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 disabled:opacity-50"
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-3.5 h-3.5" /> Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 animate-bounce" /> Record Commands
            </>
          )}
        </button>
      </div>

      {/* Omi webhook simulation tools */}
      <div className="border-t border-gray-800/80 pt-3 mt-1.5">
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-purple-400" /> Omi Webhook Simulator
        </h3>

        <div className="space-y-2">
          {/* Preset selector */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-gray-500 uppercase tracking-widest">Select Preset Voice Intake</label>
            <select
              value={selectedPreset}
              onChange={(e) => {
                setSelectedPreset(e.target.value);
                setCustomPrompt("");
              }}
              className="bg-black/40 border border-gray-800 rounded-lg p-1.5 text-[11px] text-gray-300 outline-none focus:border-cyan-500/50"
            >
              {PRESET_PROMPTS.map((prompt, idx) => (
                <option key={idx} value={prompt}>
                  {prompt.length > 45 ? `${prompt.substring(0, 42)}...` : prompt}
                </option>
              ))}
            </select>
          </div>

          {/* Custom text intake */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-gray-500 uppercase tracking-widest">Or Write Custom Transcript</label>
            <input
              type="text"
              placeholder="e.g. Research competitor note-taking apps..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="glass-input rounded-lg p-1.5 text-[11px] outline-none"
            />
          </div>

          {/* Submit simulation */}
          <button
            onClick={handleOmiPush}
            disabled={isExecuting || isRecording}
            className="w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 disabled:opacity-50 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5"
          >
            <Play className="w-3 h-3" /> Simulate Omi Device Push
          </button>
        </div>
      </div>
    </div>
  );
}
