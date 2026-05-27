"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, ExternalLink, Loader2, AlertCircle } from "lucide-react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface DirectivePanelProps {
  results: SearchResult[];
  isSearching: boolean;
  query: string;
  error: string | null;
}

export default function DirectivePanel({ results, isSearching, query, error }: DirectivePanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-panel rounded-2xl p-4 border border-cyan-500/20 overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-bold tracking-widest text-gray-100 uppercase font-mono">
          Real-Time Research Results
        </h3>
      </div>

      {query && (
        <p className="text-[10px] text-gray-500 mb-3 font-mono truncate">
          Query: <span className="text-cyan-400">&ldquo;{query}&rdquo;</span>
        </p>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-red-400 text-[10px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="font-mono">{error}</span>
        </div>
      )}

      {isSearching && (
        <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-mono mb-3 py-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Searching the web for real-time information...
        </div>
      )}

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar"
          >
            {results.map((result, i) => (
              <motion.a
                key={i}
                href={result.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="block bg-black/40 border border-gray-800/60 hover:border-cyan-500/30 rounded-lg p-2.5 transition-all group"
              >
                <div className="flex items-start gap-2">
                  <Search className="w-3 h-3 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-200 group-hover:text-cyan-300 transition-colors truncate flex items-center gap-1">
                      {result.title || "Untitled"}
                      <ExternalLink className="w-2.5 h-2.5 text-gray-600 group-hover:text-cyan-400 flex-shrink-0" />
                    </p>
                    {result.url && (
                      <p className="text-[9px] text-gray-600 truncate mt-0.5">{result.url}</p>
                    )}
                    {result.snippet && (
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {result.snippet}
                      </p>
                    )}
                  </div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!isSearching && results.length === 0 && !error && (
        <p className="text-[10px] text-gray-600 font-mono text-center py-4">
          Enter a research query above to get real-time web results
        </p>
      )}

      {!isSearching && results.length > 0 && (
        <p className="text-[9px] text-gray-600 font-mono mt-2 text-right">
          {results.length} result{results.length !== 1 ? "s" : ""} found via web search
        </p>
      )}
    </motion.div>
  );
}
