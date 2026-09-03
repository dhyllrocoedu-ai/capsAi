import type { AIMessage } from "./ai";

/**
 * A persisted conversation in the AI Adviser, analogous to a ChatGPT chat.
 * Stored per-device in localStorage until Supabase is wired in.
 */
export interface AdviserConversation {
  id: string;
  title: string;
  mode: string;
  turns: AIMessage[];
  createdAt: string;
  updatedAt: string;
}
