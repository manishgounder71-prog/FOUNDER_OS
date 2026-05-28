// FounderOS API Client Wrapper
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  assignee: "Researcher" | "Reviewer" | "Memory" | "Planner" | "System";
}

export interface WorkflowStatusResponse {
  id: string;
  prompt: string;
  status: "initializing" | "running" | "completed" | "failed";
  tasks: Task[];
  logs: { timestamp: string; sender: string; message: string; level: string }[];
  active_agent: string;
  current_step: number;
  total_steps: number;
  final_output: string;
}

export interface TimelineItem {
  id: string;
  collection: string;
  text: string;
  timestamp: string;
  type: string;
  startup_name: string;
  tag: string;
}

/**
 * Triggers a new agent workflow from text input.
 */
export async function executeWorkflow(prompt: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/workflow/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    throw new Error(`Failed to trigger workflow: ${res.statusText}`);
  }
  const data = await res.json();
  return data.workflow_id;
}

/**
 * Simulates a physical Omi wearable device webhook push.
 */
export async function simulateOmiWebhook(transcript: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/voice/omi-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
      session_id: `omi-session-${Math.random().toString(36).substring(7)}`,
      speaker: "founder",
      simulated: true
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to trigger Omi webhook: ${res.statusText}`);
  }
  const data = await res.json();
  return data.workflow_id;
}

/**
 * Queries Qdrant semantically.
 */
export async function searchMemory(query: string, collection?: string): Promise<Record<string, any>> {
  let url = `${BACKEND_URL}/api/memory/search?q=${encodeURIComponent(query)}`;
  if (collection) {
    url += `&collection=${encodeURIComponent(collection)}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed semantic search: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetches the chronological startup memory timeline from Qdrant.
 */
export async function getTimeline(): Promise<TimelineItem[]> {
  const res = await fetch(`${BACKEND_URL}/api/memory/timeline?limit=30`);
  if (!res.ok) {
    throw new Error(`Failed to fetch timeline: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Executes a real-time web research directive via Custom Directive.
 */
export async function executeDirectiveResearch(query: string): Promise<{ directive_id: string; status: string }> {
  const res = await fetch(`${BACKEND_URL}/api/directive/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`Failed to execute directive research: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Publishes a browser audio blob for transcription (Whisper/fallback).
 * Can optionally supply a mock text prompt for local validation.
 */
export async function transcribeAudio(audioBlob: Blob, mockPrompt?: string): Promise<string> {
  const formData = new FormData();
  const mimeType = audioBlob.type || "audio/webm";
  const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : "webm";
  formData.append("file", audioBlob, `recording.${extension}`);
  if (mockPrompt) {
    formData.append("mock_prompt", mockPrompt);
  }

  const res = await fetch(`${BACKEND_URL}/api/voice/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    try {
      const errData = await res.json();
      if (errData && errData.detail) {
        throw new Error(errData.detail);
      }
    } catch (e: any) {
      if (e.message && !e.message.includes("Unexpected token")) {
        throw e;
      }
    }
    throw new Error(`Transcription API failed with status ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.transcript;
}

/**
 * Saves a new vector memory directly inside Qdrant database.
 */
export async function saveMemory(collection: string, text: string, metadata?: Record<string, any>): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/memory/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection, text, metadata })
  });
  if (!res.ok) {
    throw new Error(`Failed to save memory: ${res.statusText}`);
  }
  const data = await res.json();
  return data.point_id;
}
