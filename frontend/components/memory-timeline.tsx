"use client";

import React, { useState } from "react";
import { TimelineItem } from "@/lib/api";
import { Calendar, Tag, ChevronDown, ChevronUp, Database } from "lucide-react";

interface MemoryTimelineProps {
  items: TimelineItem[];
  onSelectItem: (content: string, type: string) => void;
  isLoading: boolean;
}

export default function MemoryTimeline({ items, onSelectItem, isLoading }: MemoryTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getCollectionStyles = (collectionName: string) => {
    switch (collectionName) {
      case "conversations":
        return {
          bg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
          dot: "bg-cyan-400 glow-cyan",
          label: "Voice Intake"
        };
      case "market_research":
        return {
          bg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
          dot: "bg-amber-400",
          label: "Market Analysis"
        };
      case "strategies":
        return {
          bg: "bg-purple-500/10 text-purple-300 border-purple-500/30",
          dot: "bg-purple-400 glow-purple",
          label: "Launch GTM"
        };
      case "reports":
        return {
          bg: "bg-pink-500/10 text-pink-300 border-pink-500/30",
          dot: "bg-pink-400",
          label: "Exec Proposal"
        };
      case "workflows":
        return {
          bg: "bg-slate-500/10 text-slate-300 border-slate-500/30",
          dot: "bg-slate-400",
          label: "Workflow Log"
        };
      default:
        return {
          bg: "bg-gray-500/10 text-gray-300 border-gray-500/30",
          dot: "bg-gray-400",
          label: "Metadata"
        };
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col h-full">
      {/* Background glow orb */}
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-gray-800/60 pb-3 z-10">
        <Database className="w-5 h-5 text-purple-400" />
        <div>
          <h2 className="text-lg font-semibold tracking-wide text-gray-100 uppercase">Qdrant Memory Timeline</h2>
        </div>
      </div>

      {/* Timeline Wrapper */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 z-10 min-h-[300px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic">
            Retrieving vectors from local Qdrant...
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic text-center p-6">
            Startup memory is currently blank. Launch a workflow to begin storing ideas semantically.
          </div>
        ) : (
          <div className="relative border-l border-gray-800 ml-3 pl-6 space-y-6 py-2">
            {items.map((item) => {
              const styles = getCollectionStyles(item.collection);
              const isExpanded = expandedId === item.id;
              
              // Handle dates nicely
              const dateStr = (() => {
                if (!item.timestamp) return "Just Now";
                let ts = item.timestamp;
                if (ts && !ts.endsWith("Z") && !ts.includes("+")) {
                  ts += "Z";
                }
                return new Date(ts).toLocaleString("en-IN", { 
                  timeZone: "Asia/Kolkata",
                  dateStyle: 'short', 
                  timeStyle: 'short',
                  hour12: true 
                });
              })();

              return (
                <div 
                  key={item.id} 
                  onClick={() => onSelectItem(item.text, styles.label)}
                  className="relative group cursor-pointer transition-all duration-300 hover:translate-x-1"
                >
                  {/* Timeline bullet dot */}
                  <span className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-black transition-transform duration-300 group-hover:scale-125 ${styles.dot}`} />

                  {/* Glass card summary */}
                  <div className="bg-black/25 hover:bg-black/40 border border-gray-800/80 rounded-xl p-3.5 transition-all duration-300">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: badges & preview */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* Collection badge */}
                          <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${styles.bg}`}>
                            {styles.label}
                          </span>
                          {/* Startup name badge */}
                          <span className="text-[9px] uppercase tracking-wider text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
                            {item.startup_name}
                          </span>
                        </div>
                        
                        {/* Text preview */}
                        <p className={`text-xs text-gray-300 font-medium ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {item.text}
                        </p>
                      </div>

                      {/* Right: Expand Arrow */}
                      <button 
                        onClick={(e) => toggleExpand(item.id, e)}
                        className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Metadata strip */}
                    <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-gray-800/40 text-[10px] font-mono text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="capitalize">{item.collection.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
