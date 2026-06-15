"use client";

import React, { useEffect, useRef } from "react";
import { MessageSquare, Users, Brain, Search, Database, ShieldCheck, PenTool, TrendingUp, Terminal } from "lucide-react";

export interface BandMessage {
  id: string;
  sender: string;
  message?: string;
  thought?: string;
  timestamp: string;
  type: "message" | "thought" | "system" | "join";
}

interface BandRoomProps {
  messages: BandMessage[];
  activeAgent: string;
  status: string;
}

export default function BandRoom({ messages, activeAgent, status }: BandRoomProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getAgentStyles = (sender: string) => {
    switch (sender) {
      case "Planner Agent":
        return {
          icon: <Brain className="w-3.5 h-3.5 text-cyan-400" />,
          avatarBg: "from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300",
          bubbleBg: "bg-cyan-500/5 border-cyan-500/20",
          textColor: "text-cyan-300"
        };
      case "Research Agent":
        return {
          icon: <Search className="w-3.5 h-3.5 text-purple-400" />,
          avatarBg: "from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300",
          bubbleBg: "bg-purple-500/5 border-purple-500/20",
          textColor: "text-purple-300"
        };
      case "Financial Agent":
        return {
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
          avatarBg: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300",
          bubbleBg: "bg-emerald-500/5 border-emerald-500/20",
          textColor: "text-emerald-300"
        };
      case "Content Agent":
        return {
          icon: <PenTool className="w-3.5 h-3.5 text-amber-400" />,
          avatarBg: "from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300",
          bubbleBg: "bg-amber-500/5 border-amber-500/20",
          textColor: "text-amber-300"
        };
      case "Reviewer Agent":
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />,
          avatarBg: "from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-300",
          bubbleBg: "bg-rose-500/5 border-rose-500/20",
          textColor: "text-rose-300"
        };
      case "Memory Agent":
        return {
          icon: <Database className="w-3.5 h-3.5 text-blue-400" />,
          avatarBg: "from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-300",
          bubbleBg: "bg-blue-500/5 border-blue-500/20",
          textColor: "text-blue-300"
        };
      case "Founder":
        return {
          icon: <Terminal className="w-3.5 h-3.5 text-gray-400" />,
          avatarBg: "from-gray-700/20 to-gray-600/20 border-gray-600/40 text-gray-200",
          bubbleBg: "bg-white/[0.02] border-white/5",
          textColor: "text-gray-200"
        };
      default:
        return {
          icon: <Terminal className="w-3.5 h-3.5 text-gray-500" />,
          avatarBg: "from-gray-800 to-gray-900 border-gray-800 text-gray-400",
          bubbleBg: "bg-gray-900/50 border-gray-800",
          textColor: "text-gray-400"
        };
    }
  };

  const getAgentStatus = (agentName: string) => {
    if (status === "completed") return "standby";
    if (status === "failed") return "offline";
    if (activeAgent === agentName) return "composing";
    return "listening";
  };

  const activeListeners = [
    { name: "Planner Agent", desc: "Orchestration Layer", icon: <Brain className="w-3 h-3 text-cyan-400" /> },
    { name: "Research Agent", desc: "Competitor Intel", icon: <Search className="w-3 h-3 text-purple-400" /> },
    { name: "Financial Agent", desc: "Runway & Pricing", icon: <TrendingUp className="w-3 h-3 text-emerald-400" /> },
    { name: "Content Agent", desc: "Launch Copywriting", icon: <PenTool className="w-3 h-3 text-amber-400" /> },
    { name: "Reviewer Agent", desc: "GTM Synthesis", icon: <ShieldCheck className="w-3 h-3 text-rose-400" /> },
    { name: "Memory Agent", desc: "Qdrant Indexer", icon: <Database className="w-3 h-3 text-blue-400" /> }
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full overflow-hidden border border-white/5 relative">
      {/* Background ambient grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:24px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/40 pb-3 mb-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <div>
            <h2 className="text-xs font-bold font-mono tracking-widest text-gray-200 uppercase">Band Room</h2>
            <p className="text-[9px] text-gray-500">Live Agent Collaboration Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-800/30">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          <span className="text-[8px] font-mono text-cyan-300 font-bold uppercase tracking-wider">PHOENIX WEBSOCKETS</span>
        </div>
      </div>

      {/* Main split: Chats vs Active participants */}
      <div className="flex-1 flex gap-4 min-h-0 relative z-10">
        {/* Left chat stream */}
        <div className="flex-1 flex flex-col justify-between min-w-0 bg-black/20 border border-gray-900/40 rounded-xl p-3 relative">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-800/40 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Terminal className="w-8 h-8 text-gray-700 animate-pulse mb-2" />
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                  Room empty. Awaiting mission dispatch...
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const styles = getAgentStyles(msg.sender);
                
                if (msg.type === "system") {
                  return (
                    <div key={msg.id} className="flex items-center justify-center gap-1.5 py-1">
                      <div className="h-px bg-gray-800 flex-1" />
                      <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <Terminal className="w-2.5 h-2.5" />
                        {msg.message}
                      </span>
                      <div className="h-px bg-gray-800 flex-1" />
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Avatar circle */}
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center border flex-shrink-0 font-mono text-[10px] ${styles.avatarBg}`}>
                      {styles.icon}
                    </div>

                    {/* Chat Bubble */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-bold ${styles.textColor}`}>{msg.sender}</span>
                        <span className="text-[7px] font-mono text-gray-600">{msg.timestamp}</span>
                      </div>
                      
                      {msg.type === "thought" ? (
                        <div className="bg-white/[0.01] border-l-2 border-cyan-500/20 pl-2.5 py-1 rounded text-[9.5px] text-gray-400 italic leading-relaxed">
                          <span className="text-[8px] font-mono text-cyan-400/60 uppercase not-italic block mb-0.5 tracking-wider">Thought Chain:</span>
                          {msg.thought}
                        </div>
                      ) : (
                        <div className={`px-2.5 py-1.5 rounded-lg border text-[10px] text-gray-300 leading-relaxed font-sans ${styles.bubbleBg}`}>
                          {msg.message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={feedEndRef} />
          </div>

          {/* Typing state composer preview */}
          {activeAgent !== "None" && (
            <div className="border-t border-gray-900/60 pt-2 mt-2 flex items-center gap-2 flex-shrink-0 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">
                {activeAgent} is writing output...
              </span>
            </div>
          )}
        </div>

        {/* Right side connected panel */}
        <div className="w-[150px] flex-shrink-0 border border-gray-900/40 rounded-xl bg-black/20 p-2.5 flex flex-col min-h-0 select-none">
          <div className="flex items-center gap-1 mb-2 border-b border-gray-900/60 pb-1.5 flex-shrink-0">
            <Users className="w-3 h-3 text-purple-400" />
            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">Listeners</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {activeListeners.map((listener) => {
              const statusState = getAgentStatus(listener.name);
              
              return (
                <div key={listener.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      statusState === "composing" 
                        ? "bg-cyan-400 animate-ping" 
                        : statusState === "listening" 
                        ? "bg-green-500"
                        : "bg-gray-700"
                    }`} />
                    <span className="text-[9px] font-bold text-gray-300 tracking-tight leading-none">
                      {listener.name.replace(" Agent", "")}
                    </span>
                  </div>
                  <div className="pl-3 flex items-center justify-between text-[7px] text-gray-500 font-mono tracking-tight leading-none uppercase">
                    <span>{listener.desc}</span>
                    <span className={statusState === "composing" ? "text-cyan-400 font-bold" : ""}>
                      {statusState}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
