"use client";

import React from "react";
import { Brain, Search, Database, ShieldCheck, Activity } from "lucide-react";

interface WorkflowGraphProps {
  activeAgent: string;
  currentStep: number;
  status: string;
}

export default function WorkflowGraph({ activeAgent, currentStep, status }: WorkflowGraphProps) {
  // Determine states of each node
  const getAgentState = (agentName: string) => {
    if (status === "completed") return "completed";
    if (status === "failed") return "failed";
    if (activeAgent === agentName) return "active";
    
    // Fallback steps check
    if (agentName === "Planner Agent" && currentStep > 1) return "completed";
    if (agentName === "Research Agent" && currentStep > 3) return "completed";
    if (agentName === "Memory Agent" && (currentStep === 3 || currentStep === 5 || currentStep >= 6)) return "completed";
    if (agentName === "Reviewer Agent" && currentStep > 5) return "completed";
    
    return "idle";
  };

  const plannerState = getAgentState("Planner Agent");
  const researcherState = getAgentState("Research Agent");
  const memoryState = getAgentState("Memory Agent");
  const reviewerState = getAgentState("Reviewer Agent");

  const getNodeStyles = (state: string) => {
    switch (state) {
      case "active":
        return {
          circle: "fill-cyan-950/80 stroke-cyan-400 stroke-2 glow-cyan",
          icon: "text-cyan-400 animate-pulse",
          text: "text-cyan-300 font-bold glow-text-cyan",
          badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
        };
      case "completed":
        return {
          circle: "fill-green-950/50 stroke-green-500 stroke-2",
          icon: "text-green-400",
          text: "text-green-300 font-medium",
          badge: "bg-green-500/10 text-green-400 border-green-500/25"
        };
      case "failed":
        return {
          circle: "fill-red-950/50 stroke-red-500 stroke-2",
          icon: "text-red-400",
          text: "text-red-300",
          badge: "bg-red-500/10 text-red-400 border-red-500/25"
        };
      default:
        return {
          circle: "fill-gray-950/80 stroke-gray-800 stroke",
          icon: "text-gray-500",
          text: "text-gray-500",
          badge: "bg-gray-900 text-gray-500 border-gray-800"
        };
    }
  };

  // Node Positions (relative to 100% SVG viewbox)
  const coords = {
    planner: { x: 80, y: 150 },
    researcher: { x: 260, y: 70 },
    memory: { x: 260, y: 230 },
    reviewer: { x: 440, y: 150 }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden h-full flex flex-col justify-between">
      {/* Background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 z-10">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold tracking-wide text-gray-100 uppercase">Workflow Orchestration Graph</h2>
          </div>
          <p className="text-xs text-gray-400">Visualizing real-time agent execution pathways.</p>
        </div>
        
        {/* Status Bubble */}
        <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${
          status === "running" 
            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse"
            : status === "completed"
            ? "bg-green-500/10 text-green-400 border-green-500/30"
            : status === "failed"
            ? "bg-red-500/10 text-red-400 border-red-500/30"
            : "bg-gray-900 text-gray-400 border-gray-800"
        }`}>
          {status}
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 w-full relative min-h-[220px] flex items-center justify-center">
        <svg viewBox="0 0 520 300" className="w-full h-full max-h-[260px] z-10">
          {/* DEFINITIONS FOR SHADOW GLOWS */}
          <defs>
            <filter id="glow-cyan-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* PATH LINKS WITH TRANSITIONS */}
          {/* Planner -> Researcher */}
          <path
            d={`M ${coords.planner.x} ${coords.planner.y} L ${coords.researcher.x} ${coords.researcher.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Research Agent" 
                ? "stroke-cyan-400 animate-dash" 
                : plannerState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* Planner -> Memory */}
          <path
            d={`M ${coords.planner.x} ${coords.planner.y} L ${coords.memory.x} ${coords.memory.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Memory Agent" && currentStep === 2
                ? "stroke-cyan-400 animate-dash" 
                : plannerState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* Researcher -> Memory */}
          <path
            d={`M ${coords.researcher.x} ${coords.researcher.y} L ${coords.memory.x} ${coords.memory.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Memory Agent" && currentStep === 4
                ? "stroke-cyan-400 animate-dash" 
                : researcherState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* Researcher -> Reviewer */}
          <path
            d={`M ${coords.researcher.x} ${coords.researcher.y} L ${coords.reviewer.x} ${coords.reviewer.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Reviewer Agent" 
                ? "stroke-cyan-400 animate-dash" 
                : researcherState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* Memory -> Reviewer */}
          <path
            d={`M ${coords.memory.x} ${coords.memory.y} L ${coords.reviewer.x} ${coords.reviewer.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Memory Agent" && currentStep === 6
                ? "stroke-cyan-400 animate-dash" 
                : memoryState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* AGENT NODES */}
          
          {/* Node 1: Planner */}
          <g transform={`translate(${coords.planner.x}, ${coords.planner.y})`} className="cursor-pointer">
            <circle r="32" className={`transition-all duration-500 ${getNodeStyles(plannerState).circle}`} filter={plannerState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-16" y="-16" width="32" height="32">
              <div className="w-full h-full flex items-center justify-center">
                <Brain className={`w-6 h-6 ${getNodeStyles(plannerState).icon}`} />
              </div>
            </foreignObject>
            <text y="48" textAnchor="middle" className={`text-[10px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(plannerState).text}`}>
              Planner
            </text>
          </g>

          {/* Node 2: Researcher */}
          <g transform={`translate(${coords.researcher.x}, ${coords.researcher.y})`}>
            <circle r="32" className={`transition-all duration-500 ${getNodeStyles(researcherState).circle}`} filter={researcherState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-16" y="-16" width="32" height="32">
              <div className="w-full h-full flex items-center justify-center">
                <Search className={`w-6 h-6 ${getNodeStyles(researcherState).icon}`} />
              </div>
            </foreignObject>
            <text y="48" textAnchor="middle" className={`text-[10px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(researcherState).text}`}>
              Researcher
            </text>
          </g>

          {/* Node 3: Memory */}
          <g transform={`translate(${coords.memory.x}, ${coords.memory.y})`}>
            <circle r="32" className={`transition-all duration-500 ${getNodeStyles(memoryState).circle}`} filter={memoryState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-16" y="-16" width="32" height="32">
              <div className="w-full h-full flex items-center justify-center">
                <Database className={`w-6 h-6 ${getNodeStyles(memoryState).icon}`} />
              </div>
            </foreignObject>
            <text y="48" textAnchor="middle" className={`text-[10px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(memoryState).text}`}>
              Memory
            </text>
          </g>

          {/* Node 4: Reviewer */}
          <g transform={`translate(${coords.reviewer.x}, ${coords.reviewer.y})`}>
            <circle r="32" className={`transition-all duration-500 ${getNodeStyles(reviewerState).circle}`} filter={reviewerState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-16" y="-16" width="32" height="32">
              <div className="w-full h-full flex items-center justify-center">
                <ShieldCheck className={`w-6 h-6 ${getNodeStyles(reviewerState).icon}`} />
              </div>
            </foreignObject>
            <text y="48" textAnchor="middle" className={`text-[10px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(reviewerState).text}`}>
              Reviewer
            </text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-gray-800/40 text-[10px] font-mono uppercase tracking-widest text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400/20 border border-cyan-400" /> Active
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/10 border border-green-500" /> Completed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-950 border border-gray-800" /> Pending
        </div>
      </div>
    </div>
  );
}
