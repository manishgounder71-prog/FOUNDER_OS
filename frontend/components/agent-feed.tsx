"use client";
import React, { useEffect, useRef } from "react";
import { Terminal, Brain, Search, Database, ShieldCheck, Server, AlertCircle, TrendingUp, PenTool } from "lucide-react";

interface LogEntry {
  timestamp: string;
  sender: string;
  message: string;
  level: string;
}

interface AgentFeedProps {
  logs: LogEntry[];
}

export default function AgentFeed({ logs }: AgentFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogSenderDetails = (sender: string) => {
    switch (sender) {
      case "Planner Agent":
        return {
          icon: <Brain className="w-3.5 h-3.5 text-cyan-400" />,
          colorClass: "text-cyan-300",
          bgClass: "bg-cyan-500/10 border-cyan-500/20"
        };
      case "Research Agent":
        return {
          icon: <Search className="w-3.5 h-3.5 text-amber-400" />,
          colorClass: "text-amber-300",
          bgClass: "bg-amber-500/10 border-amber-500/20"
        };
      case "Financial Agent":
        return {
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
          colorClass: "text-emerald-300",
          bgClass: "bg-emerald-500/10 border-emerald-500/20"
        };
      case "Content Agent":
        return {
          icon: <PenTool className="w-3.5 h-3.5 text-orange-400" />,
          colorClass: "text-orange-300",
          bgClass: "bg-orange-500/10 border-orange-500/20"
        };
      case "Memory Agent":
        return {
          icon: <Database className="w-3.5 h-3.5 text-purple-400" />,
          colorClass: "text-purple-300",
          bgClass: "bg-purple-500/10 border-purple-500/20"
        };
      case "Reviewer Agent":
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-green-400" />,
          colorClass: "text-green-300",
          bgClass: "bg-green-500/10 border-green-500/20"
        };
      case "System":
        return {
          icon: <Server className="w-3.5 h-3.5 text-blue-400" />,
          colorClass: "text-blue-300",
          bgClass: "bg-blue-500/10 border-blue-500/20"
        };
      default:
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
          colorClass: "text-red-300",
          bgClass: "bg-red-500/10 border-red-500/20"
        };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col h-[280px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-gray-800/60 pb-3">
        <Terminal className="w-5 h-5 text-cyan-400" />
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-gray-200 uppercase font-mono">Live Agent Console Feed</h2>
        </div>
      </div>

      {/* Logs Window */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs space-y-2.5 pr-2"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic">
            Waiting for Omi voice command or manual trigger...
          </div>
        ) : (
          logs.map((log, index) => {
            const details = getLogSenderDetails(log.sender);
            return (
              <div 
                key={index} 
                className={`p-2.5 rounded-lg border flex gap-3 items-start transition-all duration-300 ${
                  log.level === "error" 
                    ? "bg-red-500/10 border-red-500/25 text-red-200" 
                    : details.bgClass
                }`}
              >
                {/* Sender badge icon */}
                <div className="mt-0.5">{details.icon}</div>
                
                {/* Message details */}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4 mb-0.5">
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${details.colorClass}`}>
                      {log.sender}
                    </span>
                    <span className="text-[9px] text-gray-500">
                      {(() => {
                        let ts = log.timestamp;
                        if (ts && !ts.endsWith("Z") && !ts.includes("+")) {
                          ts += "Z";
                        }
                        return new Date(ts).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true
                        });
                      })()}
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed break-words">{log.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
