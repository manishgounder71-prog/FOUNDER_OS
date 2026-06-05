"use client";

import React, { useState } from "react";
import { FileText, Copy, Check, ShieldCheck } from "lucide-react";

interface InsightsViewerProps {
  content: string;
  title: string;
  isExecuting: boolean;
}

export default function InsightsViewer({ content, title, isExecuting }: InsightsViewerProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to parse inline markdown features like **bold** text
  const parseInlineMarkdown = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold text-gray-100">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const parseChartData = (lines: string[]) => {
    let title = "Chart";
    const data: { label: string; value: number; formattedValue?: string }[] = [];
    
    lines.forEach(line => {
      if (line.toLowerCase().startsWith("title:")) {
        title = line.substring(6).trim();
      } else {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const label = parts[0].trim();
          const rawVal = parts[1].trim();
          const numericVal = parseFloat(rawVal.replace(/[^\d.-]/g, ""));
          if (!isNaN(numericVal)) {
            data.push({
              label,
              value: numericVal,
              formattedValue: rawVal
            });
          }
        }
      }
    });
    
    return { title, data };
  };

  const renderBarChart = (chartData: { title: string; data: { label: string; value: number; formattedValue?: string }[] }, key: number) => {
    const maxVal = Math.max(...chartData.data.map(d => d.value), 1);
    
    return (
      <div key={key} className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4 my-4 z-10 relative shadow-[0_0_15px_rgba(6,182,212,0.05)]">
        <h4 className="text-xs font-semibold text-gray-200 mb-3 font-mono uppercase tracking-wider">{chartData.title}</h4>
        <div className="space-y-3">
          {chartData.data.map((item, idx) => {
            const widthPercent = Math.min((item.value / maxVal) * 100, 100);
            const barGradient = idx % 2 === 0 
              ? "from-cyan-500 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]" 
              : "from-purple-500 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]";
              
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-400 font-medium">{item.label}</span>
                  <span className="text-gray-200 font-bold">{item.formattedValue || item.value}</span>
                </div>
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800/60">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ${barGradient}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPieChart = (chartData: { title: string; data: { label: string; value: number; formattedValue?: string }[] }, key: number) => {
    const total = chartData.data.reduce((sum, d) => sum + d.value, 0) || 1;
    const radius = 50;
    const circumference = 2 * Math.PI * radius; // ~314.16
    let accumulatedPercent = 0;
    
    const colors = [
      "stroke-cyan-500",
      "stroke-purple-500",
      "stroke-emerald-500",
      "stroke-pink-500",
      "stroke-amber-500",
      "stroke-indigo-500",
    ];
    
    const textColors = [
      "text-cyan-400",
      "text-purple-400",
      "text-emerald-400",
      "text-pink-400",
      "text-amber-400",
      "text-indigo-400",
    ];

    const bgColors = [
      "bg-cyan-500/10 border-cyan-500/30",
      "bg-purple-500/10 border-purple-500/30",
      "bg-emerald-500/10 border-emerald-500/30",
      "bg-pink-500/10 border-pink-500/30",
      "bg-amber-500/10 border-amber-500/30",
      "bg-indigo-500/10 border-indigo-500/30",
    ];
    
    return (
      <div key={key} className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4 my-4 z-10 relative shadow-[0_0_15px_rgba(168,85,247,0.05)]">
        <h4 className="text-xs font-semibold text-gray-200 mb-3 font-mono uppercase tracking-wider">{chartData.title}</h4>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              {chartData.data.map((item, idx) => {
                const percentage = item.value / total;
                const strokeLength = percentage * circumference;
                const strokeOffset = circumference - (accumulatedPercent * circumference);
                accumulatedPercent += percentage;
                const colorClass = colors[idx % colors.length];
                
                return (
                  <circle
                    key={idx}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    className={`${colorClass} transition-all duration-500 hover:stroke-[12]`}
                    strokeWidth="8"
                    strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                  />
                );
              })}
              <circle cx="60" cy="60" r="40" className="fill-[#050507]" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[8px] text-gray-500 font-mono uppercase">Total</span>
              <span className="text-xs font-bold text-gray-200 font-mono">100%</span>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            {chartData.data.map((item, idx) => {
              const percentage = ((item.value / total) * 100).toFixed(0);
              const colorBg = bgColors[idx % bgColors.length];
              const textColor = textColors[idx % textColors.length];
              return (
                <div key={idx} className={`p-2 rounded-lg border flex flex-col justify-between ${colorBg}`}>
                  <span className="text-[9px] text-gray-400 font-sans truncate font-medium">{item.label}</span>
                  <span className={`text-xs font-bold font-mono ${textColor} mt-0.5`}>
                    {item.formattedValue || `${percentage}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Convert markdown-like headers and lists to standard HTML for simple beautiful preview
  const renderPreview = (text: string) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    
    let inChartBar = false;
    let inChartPie = false;
    let chartLines: string[] = [];
    
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      
      if (line.trim().startsWith("```chart-bar")) {
        inChartBar = true;
        chartLines = [];
        continue;
      }
      if (line.trim().startsWith("```chart-pie")) {
        inChartPie = true;
        chartLines = [];
        continue;
      }
      
      if (inChartBar || inChartPie) {
        if (line.trim().startsWith("```")) {
          const chartData = parseChartData(chartLines);
          if (inChartBar) {
            elements.push(renderBarChart(chartData, idx));
          } else {
            elements.push(renderPieChart(chartData, idx));
          }
          inChartBar = false;
          inChartPie = false;
        } else {
          chartLines.push(line);
        }
        continue;
      }

      // Headers
      if (line.startsWith("# ")) {
        elements.push(<h1 key={idx} className="text-xl font-bold text-gray-100 border-b border-gray-800 pb-2 mt-4 mb-3">{parseInlineMarkdown(line.substring(2))}</h1>);
        continue;
      }
      if (line.startsWith("## ")) {
        elements.push(<h2 key={idx} className="text-lg font-semibold text-cyan-400 mt-4 mb-2">{parseInlineMarkdown(line.substring(3))}</h2>);
        continue;
      }
      if (line.startsWith("### ")) {
        elements.push(<h3 key={idx} className="text-sm font-semibold text-purple-400 mt-3 mb-1.5">{parseInlineMarkdown(line.substring(4))}</h3>);
        continue;
      }
      
      // Tables
      if (line.startsWith("|")) {
        const cells = line.split("|").map(c => c.trim()).filter(c => c !== "");
        if (line.includes("---")) continue;
        
        const isHeader = idx > 0 && lines[idx - 1].startsWith("#") || idx === lines.findIndex(l => l.startsWith("|"));
        elements.push(
          <div key={idx} className={`flex border-b border-gray-900/60 p-2 text-xs ${isHeader ? 'bg-cyan-950/20 font-bold text-cyan-300' : 'text-gray-300'}`}>
            {cells.map((cell, cIdx) => (
              <div key={cIdx} className="flex-1 truncate pr-2">{parseInlineMarkdown(cell)}</div>
            ))}
          </div>
        );
        continue;
      }
      
      // Bullet points
      if (line.startsWith("- ")) {
        elements.push(<li key={idx} className="text-xs text-gray-300 ml-4 list-disc mb-1">{parseInlineMarkdown(line.substring(2))}</li>);
        continue;
      }
      
      // Empty lines
      if (line.trim() === "") {
        elements.push(<div key={idx} className="h-2" />);
        continue;
      }
      
      // Normal paragraph text
      elements.push(<p key={idx} className="text-xs text-gray-300 leading-relaxed mb-2">{parseInlineMarkdown(line)}</p>);
    }
    
    return elements;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col h-full min-h-[460px]">
      {/* Background glow orb */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/60 pb-3 mb-4 z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold tracking-wide text-gray-100 uppercase">{title}</h2>
          </div>
        </div>

        {content && (
          <div className="flex items-center gap-2">
            {/* Tab controls */}
            <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 text-[10px] uppercase font-mono tracking-widest">
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                  activeTab === "preview" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/10" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("raw")}
                className={`px-3 py-1.5 rounded-md transition-all duration-200 ${
                  activeTab === "raw" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/10" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Markdown
              </button>
            </div>

            {/* Action buttons */}
            <button
              onClick={handleCopy}
              className="bg-gray-900 border border-gray-800 p-2 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
              title="Copy to Clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Content body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar z-10 pr-2">
        {isExecuting && !content ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs italic gap-3">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            Reviewer Agent is compiling launch document...
          </div>
        ) : !content ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 italic text-center p-8 gap-2">
            <ShieldCheck className="w-10 h-10 text-gray-900" />
            <p className="text-xs">No strategy report loaded.</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Trigger a workflow or select a Qdrant node to view output.</p>
          </div>
        ) : activeTab === "preview" ? (
          <div className="space-y-1 text-gray-300 prose prose-invert max-w-none">
            {renderPreview(content)}
          </div>
        ) : (
          <textarea
            readOnly
            value={content}
            className="w-full h-full bg-black/40 border border-gray-800 rounded-xl p-4 font-mono text-xs text-gray-300 resize-none outline-none custom-scrollbar"
          />
        )}
      </div>
    </div>
  );
}
