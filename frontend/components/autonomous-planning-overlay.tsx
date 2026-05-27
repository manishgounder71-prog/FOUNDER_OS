"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, ChevronRight } from "lucide-react";

interface Task {
  id: string;
  name: string;
  assignee: string;
}

interface AutonomousPlanningOverlayProps {
  isVisible: boolean;
  prompt: string;
  tasks: Task[];
  onComplete: () => void;
}

const ASSIGNEE_COLORS: Record<string, string> = {
  Researcher: "text-amber-400",
  Financial: "text-emerald-400",
  Content: "text-orange-400",
  Memory: "text-purple-400",
  Reviewer: "text-green-400",
  Planner: "text-cyan-400",
};

export default function AutonomousPlanningOverlay({
  isVisible,
  prompt,
  tasks,
  onComplete,
}: AutonomousPlanningOverlayProps) {
  const [phase, setPhase] = useState<"goal" | "plan" | "deploy" | "done">("goal");
  const [visibleTasks, setVisibleTasks] = useState<number>(0);
  const [typedPrompt, setTypedPrompt] = useState("");

  // Reset state when overlay becomes visible
  useEffect(() => {
    if (!isVisible) {
      setPhase("goal");
      setVisibleTasks(0);
      setTypedPrompt("");
      return;
    }

    // Phase 1: Typewrite the prompt
    setPhase("goal");
    let charIdx = 0;
    const typeInterval = setInterval(() => {
      charIdx++;
      setTypedPrompt(prompt.slice(0, charIdx));
      if (charIdx >= prompt.length) {
        clearInterval(typeInterval);
        // Phase 2: Show tasks
        setTimeout(() => {
          setPhase("plan");
          let taskIdx = 0;
          const taskInterval = setInterval(() => {
            taskIdx++;
            setVisibleTasks(taskIdx);
            if (taskIdx >= tasks.length) {
              clearInterval(taskInterval);
              // Phase 3: Deploy
              setTimeout(() => {
                setPhase("deploy");
                setTimeout(() => {
                  setPhase("done");
                  onComplete();
                }, 1200);
              }, 600);
            }
          }, 280);
        }, 600);
      }
    }, 22);

    return () => clearInterval(typeInterval);
  }, [isVisible, prompt, tasks]);

  return (
    <AnimatePresence>
      {isVisible && phase !== "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(3, 5, 7, 0.94)", backdropFilter: "blur(20px)" }}
        >
          {/* Ambient glow orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Scanline */}
          <div className="scanline-overlay" />

          {/* Main panel */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel hud-border rounded-2xl p-10 w-full max-w-2xl relative overflow-hidden"
          >
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-cyan-500/5 rounded-br-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-purple-500/5 rounded-tl-full pointer-events-none" />

            {/* Header badge */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 mb-6"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-cyan-400" />
                </div>
                {/* Pulse rings */}
                <div className="neural-ring absolute inset-0 rounded-xl" />
                <div className="neural-ring absolute inset-0 rounded-xl" style={{ animationDelay: "0.6s" }} />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400/70">FounderOS — Autonomous Intelligence</p>
                <p className="text-xs font-mono text-gray-500 tracking-widest uppercase">Mission Control</p>
              </div>
            </motion.div>

            {/* GOAL DETECTED */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  Goal Detected
                </span>
              </div>
              <div className="bg-black/40 border border-gray-800/60 rounded-xl p-4 font-mono text-sm text-cyan-300">
                <span className="text-gray-500 mr-2">›</span>
                {typedPrompt}
                <span className="cursor-blink text-cyan-400">█</span>
              </div>
            </motion.div>

            {/* EXECUTION PLAN */}
            <AnimatePresence>
              {phase !== "goal" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-purple-400/80 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                      Generating Execution Plan
                    </span>
                  </div>

                  <div className="space-y-2">
                    {tasks.slice(0, visibleTasks).map((task, idx) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-2.5"
                      >
                        <span className="text-[10px] font-mono text-gray-600 w-4">{String(idx + 1).padStart(2, "0")}</span>
                        <ChevronRight className="w-3 h-3 text-cyan-500/50 flex-shrink-0" />
                        <span className="text-xs text-gray-300 flex-1">{task.name}</span>
                        <span className={`text-[9px] font-mono uppercase tracking-widest ${ASSIGNEE_COLORS[task.assignee] || "text-gray-500"}`}>
                          {task.assignee}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* DEPLOYING */}
            <AnimatePresence>
              {phase === "deploy" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 pt-4 border-t border-gray-800/40"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                  </div>
                  <span className="text-sm font-mono text-cyan-300 tracking-widest uppercase shimmer-text">
                    Deploying AI Workforce...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
