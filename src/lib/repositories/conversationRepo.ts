/**
 * localStorage-backed conversation store (Phase-1 backend).
 *
 * Per-device (not per-user) until Supabase is wired in — anonymous and
 * authenticated users share the same browser history for now.
 */

import { readAll, uid, writeAll } from "./baseRepo";
import type { AdviserConversation, AIMessage } from "@/types";

const CONVERSATIONS = "conversations";

export function listConversations(): AdviserConversation[] {
  return readAll<AdviserConversation>(CONVERSATIONS)
    .filter((c) => c && c.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getConversation(id: string): AdviserConversation | null {
  return listConversations().find((c) => c.id === id) ?? null;
}

export function saveConversation(conv: AdviserConversation): void {
  const all = readAll<AdviserConversation>(CONVERSATIONS).filter((c) => c.id !== conv.id);
  writeAll<AdviserConversation>(CONVERSATIONS, [...all, conv].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  ));
}

export function deleteConversation(id: string): void {
  const all = readAll<AdviserConversation>(CONVERSATIONS).filter((c) => c.id !== id);
  writeAll<AdviserConversation>(CONVERSATIONS, all);
}

export function createConversation(
  mode: string,
  firstMessage: string,
): AdviserConversation {
  const now = new Date().toISOString();
  const turn: AIMessage = {
    id: uid(),
    role: "user",
    content: firstMessage,
    createdAt: now,
  };
  return {
    id: uid(),
    title: summarize(firstMessage),
    mode,
    turns: [turn],
    createdAt: now,
    updatedAt: now,
  };
}

function summarize(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 40 ? `${clean.slice(0, 40).trimEnd()}…` : clean || "New conversation";
}
