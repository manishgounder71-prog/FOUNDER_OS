"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Activity, Database, CheckCircle, Clock } from "lucide-react";

interface HudMetricsProps {
  isExecuting: boolean;
  activeAgent: string;
  tasks: { status: string }[];
  timelineCount: number;
  status: string;
}

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(target);
  useEffect(() => {
    if (target === 0) {
      // Reset immediately without triggering cascade — set in a microtask
      const raf = requestAnimationFrame(() => setVal(0));
      return () => cancelAnimationFrame(raf);
    }
    const steps = 20;
    const inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-[11px] text-cyan-400 tabular-nums">{time}</span>;
}

export default function HudMetrics({ isExecuting, activeAgent, tasks, timelineCount, status }: HudMetricsProps) {
  const activeCount = isExecuting ? 1 : 0;
  const pendingCount = tasks.filter(t => t.status === "pending" || t.status === "in_progress").length;
  const completedCount = tasks.filter(t => t.status === "completed").length;

  const agentsAnim = useCountUp(activeCount);
  const tasksAnim = useCountUp(pendingCount);
  const memAnim = useCountUp(timelineCount);

  const statusConfig = {
    idle:      { label: "STANDBY",   color: "text-gray-400",   dot: "bg-gray-600", border: "border-gray-700" },
    running:   { label: "EXECUTING", color: "text-cyan-400",   dot: "bg-cyan-400 animate-ping", border: "border-cyan-500/40" },
    completed: { label: "COMPLETE",  color: "text-green-400",  dot: "bg-green-400", border: "border-green-500/40" },
    failed:    { label: "FAILED",    color: "text-red-400",    dot: "bg-red-400",   border: "border-red-500/40" },
  };
  const sc = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.idle;

  const metrics = [
    {
      icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" />,
      label: "Agents Active",
      value: `${agentsAnim} / 6`,
      color: "text-cyan-300",
    },
    {
      icon: <Activity className="w-3.5 h-3.5 text-amber-400" />,
      label: "Tasks Queued",
      value: tasksAnim.toString(),
      color: "text-amber-300",
    },
    {
      icon: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
      label: "Tasks Done",
      value: completedCount.toString(),
      color: "text-green-300",
    },
    {
      icon: <Database className="w-3.5 h-3.5 text-purple-400" />,
      label: "Memory Vectors",
      value: memAnim.toString(),
      color: "text-purple-300",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="px-6 py-2 border-b border-gray-900/60 flex items-center gap-4 overflow-x-auto"
      style={{ background: "rgba(4, 7, 12, 0.7)", backdropFilter: "blur(12px)" }}
    >
      {/* System status pill */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-widest flex-shrink-0 ${sc.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
        <span className={sc.color}>{sc.label}</span>
      </div>

      <div className="w-px h-4 bg-gray-800 flex-shrink-0" />

      {/* Metrics */}
      {metrics.map((m, i) => (
        <React.Fragment key={m.label}>
          <div className="flex items-center gap-2 flex-shrink-0">
            {m.icon}
            <div>
              <p className="text-[8px] font-mono uppercase tracking-widest text-gray-600">{m.label}</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={m.value}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className={`text-sm font-bold font-mono ${m.color}`}
                >
                  {m.value}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          {i < metrics.length - 1 && <div className="w-px h-4 bg-gray-800/60 flex-shrink-0" />}
        </React.Fragment>
      ))}

      <div className="w-px h-4 bg-gray-800 flex-shrink-0 ml-auto" />

      {/* Active agent display */}
      <AnimatePresence mode="wait">
        {isExecuting && activeAgent !== "None" && (
          <motion.div
            key={activeAgent}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <span className="text-[8px] font-mono uppercase tracking-widest text-gray-600">Now Running</span>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              {activeAgent}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live clock */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Clock className="w-3 h-3 text-gray-600" />
        <LiveClock />
      </div>
    </motion.div>
  );
}
