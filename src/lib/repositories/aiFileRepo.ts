import { readAll, uid, writeAll } from "./baseRepo";
import type { AIGeneratedFile, CreateAIGeneratedFileInput } from "@/types";

const STORE = "ai_generated_files";

export function listAIGeneratedFiles(projectId: string): AIGeneratedFile[] {
  return readAll<AIGeneratedFile>(STORE)
    .filter((f) => f.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAIGeneratedFile(id: string): AIGeneratedFile | null {
  return readAll<AIGeneratedFile>(STORE).find((f) => f.id === id) ?? null;
}

export function saveAIGeneratedFile(file: AIGeneratedFile): void {
  const all = readAll<AIGeneratedFile>(STORE).filter((f) => f.id !== file.id);
  writeAll(STORE, [...all, file].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function createAIGeneratedFile(input: CreateAIGeneratedFileInput): AIGeneratedFile {
  const now = new Date().toISOString();
  const file: AIGeneratedFile = {
    id: uid(),
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    content: input.content,
    language: input.language,
    fileType: input.fileType,
    suggestedPath: input.suggestedPath,
    status: "pending",
    createdAt: now,
    createdByMessageId: input.createdByMessageId,
  };
  saveAIGeneratedFile(file);
  return file;
}

export function updateAIGeneratedFileStatus(id: string, status: "accepted" | "rejected"): void {
  const file = getAIGeneratedFile(id);
  if (!file) return;
  file.status = status;
  saveAIGeneratedFile(file);
}

export function deleteAIGeneratedFile(id: string): void {
  const all = readAll<AIGeneratedFile>(STORE).filter((f) => f.id !== id);
  writeAll(STORE, all);
}