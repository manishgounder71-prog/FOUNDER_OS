"use client";

import React from "react";
import { Brain, Search, Database, ShieldCheck, Activity, TrendingUp, PenTool } from "lucide-react";

interface WorkflowGraphProps {
  activeAgent: string;
  currentStep: number;
  status: string;
  onSelectAgent?: (agentName: string) => void;
}

export default function WorkflowGraph({ activeAgent, currentStep, status, onSelectAgent }: WorkflowGraphProps) {
  // Determine states of each node
  const getAgentState = (agentName: string) => {
    if (status === "completed") return "completed";
    if (status === "failed") return "failed";
    if (activeAgent === agentName) return "active";
    
    // Fallback steps check
    if (agentName === "Planner Agent" && currentStep > 1) return "completed";
    if (agentName === "Research Agent" && currentStep > 3) return "completed";
    if (agentName === "Financial Agent" && currentStep > 4) return "completed";
    if (agentName === "Content Agent" && currentStep > 5) return "completed";
    if (agentName === "Reviewer Agent" && currentStep > 6) return "completed";
    if (agentName === "Memory Agent" && currentStep >= 7) return "completed";
    
    return "idle";
  };

  const plannerState = getAgentState("Planner Agent");
  const researcherState = getAgentState("Research Agent");
  const financialState = getAgentState("Financial Agent");
  const contentState = getAgentState("Content Agent");
  const reviewerState = getAgentState("Reviewer Agent");
  const memoryState = getAgentState("Memory Agent");

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

  // Node Positions (relative to SVG viewbox 580 x 320)
  const coords = {
    planner: { x: 60, y: 160 },
    researcher: { x: 200, y: 55 },
    financial: { x: 200, y: 160 },
    content: { x: 200, y: 265 },
    reviewer: { x: 380, y: 160 },
    memory: { x: 520, y: 160 }
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
        <svg viewBox="0 0 580 320" className="w-full h-full max-h-[260px] z-10">
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

          {/* Planner -> Financial */}
          <path
            d={`M ${coords.planner.x} ${coords.planner.y} L ${coords.financial.x} ${coords.financial.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Financial Agent" 
                ? "stroke-cyan-400 animate-dash" 
                : plannerState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* Planner -> Content */}
          <path
            d={`M ${coords.planner.x} ${coords.planner.y} L ${coords.content.x} ${coords.content.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Content Agent" 
                ? "stroke-cyan-400 animate-dash" 
                : plannerState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* Planner -> Memory (Step 2 Pull) */}
          <path
            d={`M ${coords.planner.x} ${coords.planner.y} Q ${(coords.planner.x + coords.memory.x)/2} 290 ${coords.memory.x} ${coords.memory.y}`}
            className={`stroke-2 fill-none stroke-dashed transition-colors duration-500 ${
              activeAgent === "Memory Agent" && currentStep === 2
                ? "stroke-cyan-400 animate-dash" 
                : plannerState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
            style={{ strokeDasharray: "4,4" }}
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

          {/* Financial -> Reviewer */}
          <path
            d={`M ${coords.financial.x} ${coords.financial.y} L ${coords.reviewer.x} ${coords.reviewer.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Reviewer Agent" 
                ? "stroke-cyan-400 animate-dash" 
                : financialState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* Content -> Reviewer */}
          <path
            d={`M ${coords.content.x} ${coords.content.y} L ${coords.reviewer.x} ${coords.reviewer.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Reviewer Agent" 
                ? "stroke-cyan-400 animate-dash" 
                : contentState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* Reviewer -> Memory (Step 7 Index) */}
          <path
            d={`M ${coords.reviewer.x} ${coords.reviewer.y} L ${coords.memory.x} ${coords.memory.y}`}
            className={`stroke-2 fill-none transition-colors duration-500 ${
              activeAgent === "Memory Agent" && currentStep === 7
                ? "stroke-cyan-400 animate-dash" 
                : reviewerState === "completed" 
                ? "stroke-green-800" 
                : "stroke-gray-800"
            }`}
          />

          {/* AGENT NODES */}
          
          {/* Node 1: Planner */}
          <g 
            transform={`translate(${coords.planner.x}, ${coords.planner.y})`} 
            className="cursor-pointer hover:brightness-125 transition-all duration-300"
            onClick={() => onSelectAgent && onSelectAgent("Planner Agent")}
          >
            <circle r="26" className={`transition-all duration-500 ${getNodeStyles(plannerState).circle}`} filter={plannerState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-13" y="-13" width="26" height="26">
              <div className="w-full h-full flex items-center justify-center">
                <Brain className={`w-5 h-5 ${getNodeStyles(plannerState).icon}`} />
              </div>
            </foreignObject>
            <text y="40" textAnchor="middle" className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(plannerState).text}`}>
              Planner
            </text>
          </g>

          {/* Node 2: Researcher */}
          <g 
            transform={`translate(${coords.researcher.x}, ${coords.researcher.y})`}
            className="cursor-pointer hover:brightness-125 transition-all duration-300"
            onClick={() => onSelectAgent && onSelectAgent("Research Agent")}
          >
            <circle r="26" className={`transition-all duration-500 ${getNodeStyles(researcherState).circle}`} filter={researcherState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-13" y="-13" width="26" height="26">
              <div className="w-full h-full flex items-center justify-center">
                <Search className={`w-5 h-5 ${getNodeStyles(researcherState).icon}`} />
              </div>
            </foreignObject>
            <text y="40" textAnchor="middle" className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(researcherState).text}`}>
              Research
            </text>
          </g>

          {/* Node 3: Financial */}
          <g 
            transform={`translate(${coords.financial.x}, ${coords.financial.y})`}
            className="cursor-pointer hover:brightness-125 transition-all duration-300"
            onClick={() => onSelectAgent && onSelectAgent("Financial Agent")}
          >
            <circle r="26" className={`transition-all duration-500 ${getNodeStyles(financialState).circle}`} filter={financialState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-13" y="-13" width="26" height="26">
              <div className="w-full h-full flex items-center justify-center">
                <TrendingUp className={`w-5 h-5 ${getNodeStyles(financialState).icon}`} />
              </div>
            </foreignObject>
            <text y="40" textAnchor="middle" className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(financialState).text}`}>
              Financial
            </text>
          </g>

          {/* Node 4: Content */}
          <g 
            transform={`translate(${coords.content.x}, ${coords.content.y})`}
            className="cursor-pointer hover:brightness-125 transition-all duration-300"
            onClick={() => onSelectAgent && onSelectAgent("Content Agent")}
          >
            <circle r="26" className={`transition-all duration-500 ${getNodeStyles(contentState).circle}`} filter={contentState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-13" y="-13" width="26" height="26">
              <div className="w-full h-full flex items-center justify-center">
                <PenTool className={`w-5 h-5 ${getNodeStyles(contentState).icon}`} />
              </div>
            </foreignObject>
            <text y="40" textAnchor="middle" className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(contentState).text}`}>
              Content
            </text>
          </g>

          {/* Node 5: Reviewer */}
          <g 
            transform={`translate(${coords.reviewer.x}, ${coords.reviewer.y})`}
            className="cursor-pointer hover:brightness-125 transition-all duration-300"
            onClick={() => onSelectAgent && onSelectAgent("Reviewer Agent")}
          >
            <circle r="26" className={`transition-all duration-500 ${getNodeStyles(reviewerState).circle}`} filter={reviewerState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-13" y="-13" width="26" height="26">
              <div className="w-full h-full flex items-center justify-center">
                <ShieldCheck className={`w-5 h-5 ${getNodeStyles(reviewerState).icon}`} />
              </div>
            </foreignObject>
            <text y="40" textAnchor="middle" className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(reviewerState).text}`}>
              Reviewer
            </text>
          </g>

          {/* Node 6: Memory */}
          <g 
            transform={`translate(${coords.memory.x}, ${coords.memory.y})`}
            className="cursor-pointer hover:brightness-125 transition-all duration-300"
            onClick={() => onSelectAgent && onSelectAgent("Memory Agent")}
          >
            <circle r="26" className={`transition-all duration-500 ${getNodeStyles(memoryState).circle}`} filter={memoryState === "active" ? "url(#glow-cyan-filter)" : ""} />
            <foreignObject x="-13" y="-13" width="26" height="26">
              <div className="w-full h-full flex items-center justify-center">
                <Database className={`w-5 h-5 ${getNodeStyles(memoryState).icon}`} />
              </div>
            </foreignObject>
            <text y="40" textAnchor="middle" className={`text-[9px] font-mono tracking-widest uppercase transition-colors duration-500 ${getNodeStyles(memoryState).text}`}>
              Memory
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
