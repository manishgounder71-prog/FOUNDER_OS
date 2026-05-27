"use client";

import React, { useState, useEffect } from "react";
import VoicePanel from "@/components/voice-panel";
import WorkflowGraph from "@/components/workflow-graph";
import AgentFeed from "@/components/agent-feed";
import MemoryTimeline from "@/components/memory-timeline";
import SemanticSearch from "@/components/semantic-search";
import InsightsViewer from "@/components/insights-viewer";
import TaskBoard from "@/components/task-board";
import HudMetrics from "@/components/hud-metrics";
import AutonomousPlanningOverlay from "@/components/autonomous-planning-overlay";
import BrainGraph from "@/components/brain-graph";
import { BACKEND_URL, getTimeline, TimelineItem, Task } from "@/lib/api";
import { Radio, Database, Cpu, Shield } from "lucide-react";
import confetti from "canvas-confetti";

export default function Home() {
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState<string>("idle");
  const [activeAgent, setActiveAgent] = useState<string>("None");
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finalOutput, setFinalOutput] = useState("");
  
  // Document Viewer states
  const [selectedDocTitle, setSelectedDocTitle] = useState("Executive Strategy");
  const [selectedDocContent, setSelectedDocContent] = useState("");

  // Timeline states
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  // Autonomous Planning Overlay states
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayPrompt, setOverlayPrompt] = useState("");
  const [overlayTasks, setOverlayTasks] = useState<{ id: string; name: string; assignee: string }[]>([]);

  // Load timeline items on mount
  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    setIsTimelineLoading(true);
    try {
      const items = await getTimeline();
      setTimelineItems(items);
    } catch (err) {
      console.error("Error fetching timeline:", err);
    } finally {
      setIsTimelineLoading(false);
    }
  };

  const handleSelectTimelineItem = (content: string, type: string) => {
    setSelectedDocTitle(type);
    setSelectedDocContent(content);
  };

  const handleTriggerWorkflow = (workflowId: string, promptText: string) => {
    // Reset state for new run
    setActiveWorkflowId(workflowId);
    setIsExecuting(true);
    setStatus("running");
    setActiveAgent("None");
    setCurrentStep(0);
    setLogs([]);
    setTasks([]);
    setFinalOutput("");

    // Show autonomous planning overlay
    setOverlayPrompt(promptText);
    setOverlayTasks([]);
    setOverlayVisible(true);

    // Initialize EventSource for SSE streaming
    const eventSource = new EventSource(`${BACKEND_URL}/api/workflow/stream/${workflowId}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventName, timestamp, data } = payload;

        // Formulate a console log line
        const formatLogSender = (evt: string) => {
          if (evt.includes("memory")) return "Memory Agent";
          if (evt.includes("research")) return "Research Agent";
          if (evt.includes("financial")) return "Financial Agent";
          if (evt.includes("content")) return "Content Agent";
          if (evt.includes("review")) return "Reviewer Agent";
          if (evt.includes("tasks")) return "Planner Agent";
          return "System";
        };

        // Handle specific SSE events
        switch (eventName) {
          case "workflow_started":
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "System",
                message: `Initiating agent pipeline for task: "${promptText}"`,
                level: "info"
              }
            ]);
            break;

          case "agent_active":
            setActiveAgent(data.agent);
            setCurrentStep(data.step);
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: data.agent,
                message: `Taking control. Executing task directives...`,
                level: "info"
              }
            ]);
            break;

          case "tasks_initialized":
            setTasks(data.tasks);
            // Feed tasks into the overlay so it can animate them before dismissing
            setOverlayTasks(
              (data.tasks as Task[]).map((t) => ({
                id: t.id,
                name: t.name,
                assignee: t.assignee,
              }))
            );
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "Planner Agent",
                message: `Task breakdown complete. Subtasks queued on execution board.`,
                level: "info"
              }
            ]);
            break;

          case "memory_pulled":
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "Memory Agent",
                message: data.context_found
                  ? "Semantic memory matches retrieved. Injecting vectors into researcher context."
                  : "No overlapping semantic histories found. Proceeding with clean index.",
                level: "info"
              }
            ]);
            break;

          case "research_completed":
            setTasks(data.tasks);
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "Research Agent",
                message: "Competitor positioning analysis completed. Dispatching to memory sync.",
                level: "info"
              }
            ]);
            break;

          case "financial_completed":
            setTasks(data.tasks);
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "Financial Agent",
                message: "Financial and monetization models compiled. Dispatching to memory sync.",
                level: "info"
              }
            ]);
            break;

          case "content_completed":
            setTasks(data.tasks);
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "Content Agent",
                message: "Acquisition copywriting and branding assets drafted. Dispatching to memory sync.",
                level: "info"
              }
            ]);
            break;

          case "memory_indexed":
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "Memory Agent",
                message: `Successfully synchronized document inside collection '${data.collection}'`,
                level: "info"
              }
            ]);
            break;

          case "review_completed":
            setTasks(data.tasks);
            setFinalOutput(data.final_output);
            setSelectedDocTitle("Executive Proposal");
            setSelectedDocContent(data.final_output);
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "Reviewer Agent",
                message: "Synthesis and editing complete. Document meets launch specifications.",
                level: "info"
              }
            ]);
            break;

          case "workflow_completed":
            setTasks(data.tasks);
            setFinalOutput(data.final_output);
            setSelectedDocTitle("Executive Proposal");
            setSelectedDocContent(data.final_output);
            setStatus("completed");
            setIsExecuting(false);
            setActiveAgent("None");
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "System",
                message: "All agent queues finished. Startup OS in standby mode.",
                level: "info"
              }
            ]);
            
            // Trigger confetti explosion to celebrate
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.8 },
              colors: ["#06b6d4", "#a855f7", "#22c55e"]
            });
            
            fetchTimeline();
            eventSource.close();
            break;

          case "workflow_failed":
            setStatus("failed");
            setIsExecuting(false);
            setActiveAgent("None");
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "System",
                message: `Workflow aborted: ${data.error}`,
                level: "error"
              }
            ]);
            eventSource.close();
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error:", err);
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          sender: "System",
          message: "SSE stream connection closed or timed out.",
          level: "error"
        }
      ]);
      setStatus("failed");
      setIsExecuting(false);
      eventSource.close();
    };
  };

  return (
    <main className="min-h-screen bg-[#030303] text-gray-100 flex flex-col relative">
      {/* Autonomous Planning Overlay (full-screen, z-50) */}
      <AutonomousPlanningOverlay
        isVisible={overlayVisible}
        prompt={overlayPrompt}
        tasks={overlayTasks}
        onComplete={() => setOverlayVisible(false)}
      />

      {/* Background ambient neon glow filters */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Futuristic Navbar */}
      <header className="border-b border-gray-900/60 bg-black/40 backdrop-blur-md px-8 py-4 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center glow-cyan">
            <Cpu className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-wider font-mono bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent uppercase">
              FounderOS
            </h1>
            <p className="text-[10px] tracking-widest text-gray-400 uppercase font-mono">
              The AI Startup Operating System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-[10px] font-mono uppercase tracking-widest text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
            <span>Omi Wearable Sync: ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>Qdrant: LOCAL PERSISTENT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lyzr Orchestration: READY</span>
          </div>
        </div>
      </header>

      {/* HUD Metrics Sub-header Bar */}
      <HudMetrics
        isExecuting={isExecuting}
        activeAgent={activeAgent}
        tasks={tasks}
        timelineCount={timelineItems.length}
        status={status}
      />

      {/* Main Grid Layout Workspace */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 z-10 max-w-[1700px] w-full mx-auto">
        {/* LEFT COLUMN: Voice intake & Task execution checklist */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="h-[460px]">
            <VoicePanel onTriggerWorkflow={handleTriggerWorkflow} isExecuting={isExecuting} />
          </div>
          <div className="h-[280px]">
            <TaskBoard tasks={tasks} />
          </div>
        </div>

        {/* MIDDLE COLUMN: Orchestration SVG graph & Live agent console logs */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="h-[460px]">
            <WorkflowGraph activeAgent={activeAgent} currentStep={currentStep} status={status} />
          </div>
          <div>
            <AgentFeed logs={logs} />
          </div>
        </div>

        {/* RIGHT COLUMN: Memory timeline list & Global semantic search */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="h-[460px]">
            <MemoryTimeline 
              items={timelineItems} 
              onSelectItem={handleSelectTimelineItem}
              isLoading={isTimelineLoading} 
            />
          </div>
          <div className="h-[280px]">
            <SemanticSearch onSelectDocument={handleSelectTimelineItem} />
          </div>
        </div>

        {/* BOTTOM FULL-WIDTH STRIP: Executive Assets report editor */}
        <div className="xl:col-span-4 mt-2">
          <InsightsViewer 
            content={selectedDocContent} 
            title={selectedDocTitle} 
            isExecuting={isExecuting} 
          />
        </div>
      </div>

      {/* Floating Startup Brain Knowledge Graph */}
      <BrainGraph
        items={timelineItems}
        onSelectItem={handleSelectTimelineItem}
      />
    </main>
  );
}
