"use client";

import React, { useState } from "react";
import { Search, Compass, Database, FileText, CornerDownRight } from "lucide-react";
import { searchMemory } from "@/lib/api";

interface SemanticSearchProps {
  onSelectDocument: (text: string, title: string) => void;
}

interface QdrantHit {
  id: string;
  score: number;
  payload: {
    text?: string;
    startup_name?: string;
    type?: string;
    timestamp?: string;
  };
}

export default function SemanticSearch({ onSelectDocument }: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<string, QdrantHit[]>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await searchMemory(query.trim());
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults({});
    } finally {
      setIsSearching(false);
    }
  };

  const getCollectionTitle = (col: string) => {
    switch (col) {
      case "conversations": return "Voice Transcripts";
      case "market_research": return "Market & Competitor Insights";
      case "strategies": return "Launch Strategies";
      case "reports": return "Executive Blueprints";
      case "startup_ideas": return "Startup Brainstorms";
      case "workflows": return "Workflow Records";
      default: return col;
    }
  };

  const getCollectionIcon = (col: string) => {
    switch (col) {
      case "conversations": return <Database className="w-3.5 h-3.5 text-cyan-400" />;
      case "market_research": return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case "strategies": return <Compass className="w-3.5 h-3.5 text-purple-400" />;
      default: return <FileText className="w-3.5 h-3.5 text-pink-400" />;
    }
  };

  // Check if we have any results
  const hasResults = Object.keys(results).some(col => results[col] && results[col].length > 0);

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col h-full">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Title */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-wider text-gray-200 uppercase font-mono flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400" /> Global Semantic Search
        </h2>
        <p className="text-[10px] text-gray-500 uppercase mt-0.5">Queries local Qdrant collections using vector distances.</p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="e.g. show SaaS pricing discussions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="glass-input rounded-xl px-4 py-2.5 text-xs flex-1"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 disabled:opacity-50"
        >
          Query
        </button>
      </form>

      {/* Results Box */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[160px] space-y-4">
        {isSearching ? (
          <div className="h-full flex items-center justify-center text-gray-600 font-mono text-xs italic">
            Retrieving vector neighbors from Qdrant index...
          </div>
        ) : !hasSearched ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 font-mono text-[10px] uppercase text-center tracking-widest gap-2 p-4">
            <Compass className="w-6 h-6 text-gray-800 animate-spin" style={{ animationDuration: '6s' }} />
            Enter a search string to scan the database.
          </div>
        ) : !hasResults ? (
          <div className="h-full flex items-center justify-center text-gray-500 font-mono text-xs text-center p-4">
            No matches found. Try another concept.
          </div>
        ) : (
          Object.keys(results).map((col) => {
            const hits = results[col];
            if (!hits || hits.length === 0) return null;

            return (
              <div key={col} className="space-y-1.5">
                {/* Collection title header */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                  {getCollectionIcon(col)}
                  <span>{getCollectionTitle(col)}</span>
                </div>

                {/* Match items */}
                <div className="space-y-1.5 pl-2 border-l border-gray-800/80">
                  {hits.map((hit: QdrantHit) => {
                    const payload = hit.payload || {};
                    const text = payload.text || "";
                    const score = hit.score || 0.0;
                    
                    // Format score as percentage relevance
                    // Cosine similarity ranges from -1 to 1, or 0 to 1 for normalized vectors
                    const relevancePct = Math.min(Math.max(Math.round(score * 100), 0), 100);
                    
                    return (
                      <div
                        key={hit.id}
                        onClick={() => onSelectDocument(text, getCollectionTitle(col))}
                        className="bg-black/20 hover:bg-black/35 border border-gray-800/40 rounded-lg p-2.5 cursor-pointer transition-all duration-200 group flex items-start gap-2"
                      >
                        <CornerDownRight className="w-3.5 h-3.5 text-gray-600 mt-0.5 group-hover:text-cyan-400 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono">
                              Startup: {payload.startup_name || "General"}
                            </span>
                            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                              Relevance: {relevancePct}%
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed">
                            {text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
