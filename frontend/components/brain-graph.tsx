"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, X, ZoomIn } from "lucide-react";
import { TimelineItem } from "@/lib/api";

interface BrainGraphProps {
  items: TimelineItem[];
  onSelectItem: (content: string, type: string) => void;
}

const COLLECTION_COLORS: Record<string, { stroke: string; fill: string; glow: string }> = {
  conversations:   { stroke: "#00d4ff", fill: "rgba(0,212,255,0.08)", glow: "rgba(0,212,255,0.5)" },
  market_research: { stroke: "#f59e0b", fill: "rgba(245,158,11,0.08)", glow: "rgba(245,158,11,0.5)" },
  strategies:      { stroke: "#a855f7", fill: "rgba(168,85,247,0.08)", glow: "rgba(168,85,247,0.5)" },
  reports:         { stroke: "#ec4899", fill: "rgba(236,72,153,0.08)", glow: "rgba(236,72,153,0.5)" },
  workflows:       { stroke: "#64748b", fill: "rgba(100,116,139,0.08)", glow: "rgba(100,116,139,0.5)" },
};

const DEFAULT_COLOR = { stroke: "#94a3b8", fill: "rgba(148,163,184,0.08)", glow: "rgba(148,163,184,0.4)" };

// Layout nodes in a circular arrangement
function getNodePositions(count: number, cx = 200, cy = 170, r = 120) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

export default function BrainGraph({ items, onSelectItem }: BrainGraphProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Limit to 8 nodes max, deduplicated by startup_name
  const nodes = useMemo(() => {
    const seen = new Set<string>();
    return items
      .filter(item => { const k = item.startup_name; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 8);
  }, [items]);

  const positions = useMemo(() => getNodePositions(nodes.length), [nodes.length]);

  // Connect nodes that share the same startup_name group
  const edges = useMemo(() => {
    const result: { from: number; to: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const j = (i + 1) % nodes.length;
      result.push({ from: i, to: j });
    }
    // Central hub edges
    if (nodes.length > 3) {
      const center = Math.floor(nodes.length / 2);
      for (let i = 0; i < nodes.length; i += 2) {
        if (i !== center) result.push({ from: center, to: i });
      }
    }
    return result;
  }, [nodes]);

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-widest font-mono transition-all"
        style={{
          background: "rgba(8,12,20,0.9)",
          border: "1px solid rgba(168,85,247,0.4)",
          boxShadow: "0 0 24px rgba(168,85,247,0.2)",
          color: "#c084fc",
          backdropFilter: "blur(16px)"
        }}
      >
        <BrainCircuit className="w-4 h-4" />
        {isOpen ? "Hide Brain" : "Startup Brain"}
      </motion.button>

      {/* Brain Graph Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 right-6 z-40 w-[420px] glass-panel rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(168,85,247,0.12)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-200 font-mono">
                  Startup Intelligence Map
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-gray-600">
                  {nodes.length} Concepts Mapped
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-600 hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SVG Graph */}
            <div className="p-4">
              {nodes.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-600 text-xs italic gap-2">
                  <BrainCircuit className="w-8 h-8 text-gray-800" />
                  Run a workflow to build your startup knowledge graph
                </div>
              ) : (
                <svg viewBox="0 0 400 340" className="w-full" style={{ height: 300 }}>
                  <defs>
                    {Object.entries(COLLECTION_COLORS).map(([key, col]) => (
                      <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feFlood floodColor={col.glow} floodOpacity="0.6" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="shadow" />
                        <feMerge>
                          <feMergeNode in="shadow" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    ))}
                  </defs>

                  {/* Edges */}
                  {edges.map((edge, i) => {
                    const from = positions[edge.from];
                    const to = positions[edge.to];
                    if (!from || !to) return null;
                    const isActive = hoveredId === nodes[edge.from]?.id || hoveredId === nodes[edge.to]?.id;
                    return (
                      <line
                        key={i}
                        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke={isActive ? "rgba(168,85,247,0.6)" : "rgba(255,255,255,0.04)"}
                        strokeWidth={isActive ? 1.5 : 1}
                        strokeDasharray={isActive ? "4,3" : "2,4"}
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Central core */}
                  <circle cx={200} cy={170} r={20}
                    fill="rgba(168,85,247,0.07)"
                    stroke="rgba(168,85,247,0.3)"
                    strokeWidth="1"
                  />
                  <circle cx={200} cy={170} r={20}
                    fill="none"
                    stroke="rgba(168,85,247,0.2)"
                    strokeWidth="12"
                    className="radar-sweep"
                  />
                  <text x={200} y={175} textAnchor="middle" fontSize="8" fill="rgba(168,85,247,0.7)" fontFamily="monospace">
                    BRAIN
                  </text>

                  {/* Nodes */}
                  {nodes.map((item, i) => {
                    const pos = positions[i];
                    if (!pos) return null;
                    const col = COLLECTION_COLORS[item.collection] ?? DEFAULT_COLOR;
                    const isHovered = hoveredId === item.id;
                    const label = item.startup_name.length > 14
                      ? item.startup_name.slice(0, 12) + "…"
                      : item.startup_name;

                    return (
                      <g
                        key={item.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => onSelectItem(item.text, item.collection)}
                      >
                        {/* Outer glow ring */}
                        {isHovered && (
                          <circle r={22} fill="none" stroke={col.stroke} strokeWidth="1" opacity="0.4"
                            style={{ animation: "neural-pulse 1.5s ease-out infinite" }}
                          />
                        )}
                        {/* Node circle */}
                        <circle
                          r={isHovered ? 17 : 14}
                          fill={col.fill}
                          stroke={col.stroke}
                          strokeWidth={isHovered ? 1.5 : 1}
                          filter={isHovered ? `url(#glow-${item.collection})` : undefined}
                          className="transition-all duration-300"
                        />
                        {/* Label */}
                        <text
                          y={26}
                          textAnchor="middle"
                          fontSize="7"
                          fill={isHovered ? col.stroke : "rgba(156,163,175,0.7)"}
                          fontFamily="monospace"
                          className="transition-all duration-300"
                        >
                          {label}
                        </text>
                        {/* Collection dot */}
                        <circle
                          cx={10} cy={-10}
                          r={3}
                          fill={col.stroke}
                          opacity="0.8"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Legend */}
            <div className="px-5 pb-4 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(COLLECTION_COLORS).map(([key, col]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.stroke }} />
                  <span className="text-[8px] font-mono uppercase tracking-widest text-gray-600">
                    {key.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
