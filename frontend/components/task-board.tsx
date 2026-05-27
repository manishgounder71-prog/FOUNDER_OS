"use client";

import React from "react";
import { Task } from "@/lib/api";
import { ListTodo, Brain, Search, Database, ShieldCheck, CheckCircle2, Circle } from "lucide-react";

interface TaskBoardProps {
  tasks: Task[];
}

export default function TaskBoard({ tasks }: TaskBoardProps) {
  const getAssigneeIcon = (assignee: string) => {
    switch (assignee) {
      case "Researcher":
        return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case "Memory":
        return <Database className="w-3.5 h-3.5 text-purple-400" />;
      case "Reviewer":
        return <ShieldCheck className="w-3.5 h-3.5 text-green-400" />;
      default:
        return <Brain className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return {
          border: "border-green-500/20 bg-green-500/5",
          badge: "bg-green-500/10 text-green-400 border-green-500/20",
          text: "text-gray-400 line-through"
        };
      case "running":
        return {
          border: "border-cyan-500/30 bg-cyan-500/5 animate-pulse",
          badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse",
          text: "text-white font-medium"
        };
      default:
        return {
          border: "border-gray-800 bg-black/10",
          badge: "bg-gray-900 text-gray-500 border-gray-800",
          text: "text-gray-300"
        };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-gray-800/60 pb-3">
        <ListTodo className="w-5 h-5 text-cyan-400" />
        <div>
          <h2 className="text-lg font-semibold tracking-wide text-gray-100 uppercase">Task Execution Board</h2>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-2 min-h-[180px]">
        {tasks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic">
            Task checklist is empty.
          </div>
        ) : (
          tasks.map((task) => {
            const styles = getStatusStyle(task.status);
            return (
              <div 
                key={task.id} 
                className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all duration-300 ${styles.border}`}
              >
                {/* Left side: status bullet and task name */}
                <div className="flex items-center gap-3 min-w-0">
                  {task.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className={`w-4 h-4 flex-shrink-0 ${task.status === 'running' ? 'text-cyan-400 animate-pulse' : 'text-gray-600'}`} />
                  )}
                  <span className={`text-xs truncate ${styles.text}`}>
                    {task.name}
                  </span>
                </div>

                {/* Right side: Assignee & status badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Assignee Badge */}
                  <span className="flex items-center gap-1 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-400">
                    {getAssigneeIcon(task.assignee)}
                    <span>{task.assignee}</span>
                  </span>
                  
                  {/* Status Badge */}
                  <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
