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
import { BACKEND_URL, getTimeline, TimelineItem, Task, executeDirectiveResearch, simulateOmiWebhook } from "@/lib/api";
import FounderPersona from "@/components/founder-persona";
import DirectivePanel from "@/components/directive-panel";
import { Radio, Database, Cpu, Shield, X, Sparkles, Award, ExternalLink, Presentation, Rocket } from "lucide-react";
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
  
  // State for interactive features
  const [memoryMatches, setMemoryMatches] = useState<any[]>([]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string | null>(null);
  const [isPitchModalOpen, setIsPitchModalOpen] = useState(false);
  const [rightActiveTab, setRightActiveTab] = useState<"search" | "persona">("search");
  
  // Document Viewer states
  const [selectedDocTitle, setSelectedDocTitle] = useState("Executive Strategy");
  const [selectedDocContent, setSelectedDocContent] = useState("");

  // Timeline states
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  // Directive Research states
  const [directiveResults, setDirectiveResults] = useState<any[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [directiveQuery, setDirectiveQuery] = useState("");
  const [directiveError, setDirectiveError] = useState<string | null>(null);

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

  const handleResearchQuery = async (query: string) => {
    setDirectiveQuery(query);
    setDirectiveResults([]);
    setDirectiveError(null);
    setIsResearching(true);

    try {
      const { directive_id } = await executeDirectiveResearch(query);

      const eventSource = new EventSource(`${BACKEND_URL}/api/directive/stream/${directive_id}`);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventName, data } = payload;

          switch (eventName) {
            case "result_found":
              setDirectiveResults((prev) => [...prev, data.result]);
              break;
            case "research_completed":
              setDirectiveResults(data.results);
              setIsResearching(false);
              eventSource.close();
              break;
            case "research_failed":
              setDirectiveError(data.error || "Research failed");
              setIsResearching(false);
              eventSource.close();
              break;
          }
        } catch (err) {
          console.error("Directive SSE parse error:", err);
        }
      };

      eventSource.onerror = () => {
        setDirectiveError("Connection lost during research");
        setIsResearching(false);
        eventSource.close();
      };
    } catch (err: any) {
      setDirectiveError(err.message || "Failed to start research");
      setIsResearching(false);
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
    setMemoryMatches([]);
    setSelectedAgentFilter(null);

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
            if (data.matches) {
              setMemoryMatches(data.matches);
            }
            setLogs((prev) => [
              ...prev,
              {
                timestamp,
                sender: "Memory Agent",
                message: data.context_found
                  ? `Semantic memory matches retrieved (${data.matches?.length || 0} vectors). Injecting into researcher context.`
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
          <button 
            onClick={() => setIsPitchModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/35 hover:to-cyan-500/35 border border-purple-500/40 text-purple-300 hover:text-purple-200 transition-all duration-300 rounded-lg font-mono text-[9px] font-bold"
          >
            <Presentation className="w-3.5 h-3.5 text-purple-400" />
            <span>Pitch & Demo Guide</span>
          </button>
          
          <div className="w-px h-4 bg-gray-800" />

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
            <VoicePanel
              onTriggerWorkflow={handleTriggerWorkflow}
              onResearchQuery={handleResearchQuery}
              isExecuting={isExecuting}
              isResearching={isResearching}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <DirectivePanel
              results={directiveResults}
              isSearching={isResearching}
              query={directiveQuery}
              error={directiveError}
            />
          </div>
          <div className="h-[140px]">
            <TaskBoard tasks={tasks} />
          </div>
        </div>

        {/* MIDDLE COLUMN: Orchestration SVG graph & Live agent console logs */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="h-[460px]">
            <WorkflowGraph 
              activeAgent={activeAgent} 
              currentStep={currentStep} 
              status={status} 
              onSelectAgent={(agentName) => setSelectedAgentFilter(selectedAgentFilter === agentName ? null : agentName)}
              memoryMatches={memoryMatches}
            />
          </div>
          <div>
            <AgentFeed 
              logs={logs} 
              filter={selectedAgentFilter}
              onClearFilter={() => setSelectedAgentFilter(null)}
            />
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
          <div className="h-[340px] flex flex-col gap-2">
            {/* Tabs selector */}
            <div className="flex gap-2 bg-[#08080a]/50 border border-gray-900/60 p-1 rounded-xl flex-shrink-0">
              <button
                onClick={() => setRightActiveTab("search")}
                className={`flex-1 py-1.5 text-[9px] font-bold font-mono uppercase tracking-widest rounded-lg transition-all duration-300 ${
                  rightActiveTab === "search"
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Semantic Search
              </button>
              <button
                onClick={() => setRightActiveTab("persona")}
                className={`flex-1 py-1.5 text-[9px] font-bold font-mono uppercase tracking-widest rounded-lg transition-all duration-300 ${
                  rightActiveTab === "persona"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Founder Persona
              </button>
            </div>

            <div className="flex-1 min-h-0">
              {rightActiveTab === "search" ? (
                <SemanticSearch onSelectDocument={handleSelectTimelineItem} />
              ) : (
                <FounderPersona onRefreshTimeline={fetchTimeline} />
              )}
            </div>
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

      {/* Pitch Deck & Demo Simulator Modal */}
      {isPitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#050507]/95 border border-gray-800/80 rounded-2xl p-8 max-w-2xl w-full relative shadow-[0_0_50px_rgba(168,85,247,0.2)] max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsPitchModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2.5 mb-6">
              <Award className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold tracking-wider text-gray-100 uppercase font-mono bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                FounderOS Pitch & Demo Guide
              </h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> 1. The Value Proposition
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Solo founders frequently face decision fatigue and context-switching overhead. FounderOS solves this by deploying a collaborative, specialized multi-agent AI team (Planner, Researcher, Financial, Content, Reviewer, Memory) controlled via speech, backed by a persistent semantic memory layer that retains knowledge forever.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> 2. Technical Depth
                </h3>
                <ul className="text-xs text-gray-400 leading-relaxed list-disc list-inside space-y-1 font-sans">
                  <li><strong>Voice Intake</strong>: Integrates physical wearable telemetry (Omi device webhooks) and Whisper transcribing.</li>
                  <li><strong>Orchestration</strong>: Powered by Lyzr, coordinating sequential background agent queues using Server-Sent Events (SSE).</li>
                  <li><strong>Semantic Memory</strong>: Uses Qdrant cosine vector matching (local DB) to index and retrieve past contextual knowledge blocks.</li>
                </ul>
              </div>

              <div className="border-t border-gray-900 pt-5">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3 font-mono flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> 3. One-Click Demo Presets
                </h3>
                <p className="text-[11px] text-gray-500 mb-3 font-mono">
                  Click a preset below to instantly trigger the multi-agent execution pipeline with custom simulated content and semantic vector indexing:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      title: "EdTech Study Copilot",
                      desc: "Calculates study tools TAM, targets student active recall markets, and models Quizlet competition.",
                      prompt: "Create a launch strategy for an AI study app."
                    },
                    {
                      title: "Secure Local Notes",
                      desc: "Models Obsidian/Notion comparison, pricing plans for encrypted sync, and self-hosted storage.",
                      prompt: "Research competitors for an AI note-taking app."
                    },
                    {
                      title: "SaaS Billing Dashboard",
                      desc: "Simulates seat caps, credit thresholds, and conversion projections for Stripe analytics.",
                      prompt: "Find market opportunities for a B2B SaaS pricing optimization dashboard."
                    },
                    {
                      title: "AI Shopping Cart",
                      desc: "Compares Shopify/Amazon checkouts, models affiliate commissions, and styles personal shopping.",
                      prompt: "Create a launch strategy for an AI shopping app."
                    }
                  ].map((preset) => (
                    <button
                      key={preset.title}
                      onClick={async () => {
                        setIsPitchModalOpen(false);
                        try {
                          const workflowId = await simulateOmiWebhook(preset.prompt);
                          handleTriggerWorkflow(workflowId, preset.prompt);
                        } catch (err) {
                          console.error("Preset demo failed", err);
                        }
                      }}
                      disabled={isExecuting}
                      className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-gray-800/60 rounded-xl text-left transition-all duration-300 flex flex-col justify-between group disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-200 group-hover:text-purple-300 transition-colors font-mono mb-1">
                          {preset.title}
                        </p>
                        <p className="text-[10px] text-gray-500 leading-normal mb-2">
                          {preset.desc}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono uppercase text-cyan-400 group-hover:underline flex items-center gap-1">
                        Deploy Mission <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-900 flex justify-end">
              <button
                onClick={() => setIsPitchModalOpen(false)}
                className="px-5 py-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 rounded-lg text-xs font-bold font-mono text-gray-300 uppercase tracking-widest transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
