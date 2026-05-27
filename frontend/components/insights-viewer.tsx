"use client";

import React, { useState } from "react";
import { FileText, Copy, Check, ShieldCheck, Download } from "lucide-react";

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

  // Convert markdown-like headers and lists to standard HTML for simple beautiful preview
  const renderPreview = (text: string) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith("# ")) {
        return <h1 key={idx} className="text-xl font-bold text-gray-100 border-b border-gray-800 pb-2 mt-4 mb-3">{parseInlineMarkdown(line.substring(2))}</h1>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-lg font-semibold text-cyan-400 mt-4 mb-2">{parseInlineMarkdown(line.substring(3))}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-semibold text-purple-400 mt-3 mb-1.5">{parseInlineMarkdown(line.substring(4))}</h3>;
      }
      
      // Tables
      if (line.startsWith("|")) {
        // Simple cell splitter
        const cells = line.split("|").map(c => c.trim()).filter(c => c !== "");
        // Skip separator lines e.g. | :--- | :--- |
        if (line.includes("---")) return null;
        
        const isHeader = idx > 0 && lines[idx - 1].startsWith("#") || idx === lines.findIndex(l => l.startsWith("|"));
        return (
          <div key={idx} className={`flex border-b border-gray-900/60 p-2 text-xs ${isHeader ? 'bg-cyan-950/20 font-bold text-cyan-300' : 'text-gray-300'}`}>
            {cells.map((cell, cIdx) => (
              <div key={cIdx} className="flex-1 truncate pr-2">{parseInlineMarkdown(cell)}</div>
            ))}
          </div>
        );
      }
      
      // Bullet points
      if (line.startsWith("- ")) {
        return <li key={idx} className="text-xs text-gray-300 ml-4 list-disc mb-1">{parseInlineMarkdown(line.substring(2))}</li>;
      }
      
      // Empty lines
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      
      // Normal paragraph text
      return <p key={idx} className="text-xs text-gray-300 leading-relaxed mb-2">{parseInlineMarkdown(line)}</p>;
    });
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
