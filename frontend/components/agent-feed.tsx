"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Brain, Search, Database, ShieldCheck, Server, AlertCircle, TrendingUp, PenTool, Wifi } from "lucide-react";

interface LogEntry {
  timestamp: string;
  sender: string;
  message: string;
  level: string;
}

interface AgentFeedProps {
  logs: LogEntry[];
}

const AGENT_CONFIG: Record<string, {
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderColor: string;
  status: string;
}> = {
  "Planner Agent": {
    icon: <Brain className="w-3.5 h-3.5" />,
    colorClass: "text-cyan-300",
    bgClass: "bg-cyan-500/8",
    borderColor: "border-l-cyan-500/60",
    status: "ANALYZING",
  },
  "Research Agent": {
    icon: <Search className="w-3.5 h-3.5" />,
    colorClass: "text-amber-300",
    bgClass: "bg-amber-500/8",
    borderColor: "border-l-amber-500/60",
    status: "RESEARCHING",
  },
  "Financial Agent": {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    colorClass: "text-emerald-300",
    bgClass: "bg-emerald-500/8",
    borderColor: "border-l-emerald-500/60",
    status: "MODELING",
  },
  "Content Agent": {
    icon: <PenTool className="w-3.5 h-3.5" />,
    colorClass: "text-orange-300",
    bgClass: "bg-orange-500/8",
    borderColor: "border-l-orange-500/60",
    status: "GENERATING",
  },
  "Memory Agent": {
    icon: <Database className="w-3.5 h-3.5" />,
    colorClass: "text-purple-300",
    bgClass: "bg-purple-500/8",
    borderColor: "border-l-purple-500/60",
    status: "STORING",
  },
  "Reviewer Agent": {
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    colorClass: "text-green-300",
    bgClass: "bg-green-500/8",
    borderColor: "border-l-green-500/60",
    status: "REVIEWING",
  },
  "System": {
    icon: <Server className="w-3.5 h-3.5" />,
    colorClass: "text-blue-300",
    bgClass: "bg-blue-500/8",
    borderColor: "border-l-blue-500/40",
    status: "INFO",
  },
};

const DEFAULT_CONFIG = {
  icon: <AlertCircle className="w-3.5 h-3.5" />,
  colorClass: "text-red-300",
  bgClass: "bg-red-500/8",
  borderColor: "border-l-red-500/40",
  status: "ERROR",
};

function AgentLogEntry({ log, index }: { log: LogEntry; index: number }) {
  const config = AGENT_CONFIG[log.sender] ?? DEFAULT_CONFIG;
  const isError = log.level === "error";

  const timeStr = (() => {
    let ts = log.timestamp;
    if (ts && !ts.endsWith("Z") && !ts.includes("+")) ts += "Z";
    return new Date(ts).toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    });
  })();

  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-lg border border-gray-800/50 border-l-2 overflow-hidden transition-all duration-300 ${
        isError
          ? "bg-red-500/8 border-l-red-500/60"
          : config.bgClass + " " + config.borderColor
      }`}
    >
      <div className="px-3 py-2.5 flex gap-3 items-start">
        {/* Icon */}
        <div className={`mt-0.5 flex-shrink-0 ${isError ? "text-red-400" : config.colorClass}`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold uppercase tracking-[0.2em] font-mono ${isError ? "text-red-300" : config.colorClass}`}>
                {log.sender}
              </span>
              <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                isError
                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : "bg-black/30 text-gray-600 border-gray-800"
              }`}>
                {isError ? "ERROR" : config.status}
              </span>
            </div>
            <span className="text-[9px] text-gray-600 font-mono flex-shrink-0">{timeStr}</span>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed font-mono break-words">
            {log.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function AgentFeed({ logs }: AgentFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLive = logs.length > 0;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass-panel rounded-2xl p-5 relative overflow-hidden flex flex-col h-[300px]"
    >
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/4 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-gray-800/50 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-widest text-gray-200 uppercase font-mono">
            Live Agent Console
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full"
            >
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
              Live
            </motion.div>
          )}
          <span className="text-[9px] font-mono text-gray-600 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded-full">
            {logs.length} events
          </span>
        </div>
      </div>

      {/* Log window */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            {/* Animated neural idle state */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border border-gray-800" />
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-gray-700" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Awaiting Command</p>
              <p className="text-[9px] text-gray-700 font-mono mt-0.5">Agents on standby...</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <AgentLogEntry key={i} log={log} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
