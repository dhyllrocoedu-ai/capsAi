import { readAll, uid, writeAll } from "./baseRepo";
import type { VirtualFile, CreateVirtualFileInput } from "@/types";

const PREFIX = "virtual_files_"; // + projectId

function storeKey(projectId: string): string {
  return `${PREFIX}${projectId}`;
}

export function listVirtualFiles(projectId: string): VirtualFile[] {
  return readAll<VirtualFile>(storeKey(projectId))
    .filter((f) => f.projectId === projectId)
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function getVirtualFile(projectId: string, id: string): VirtualFile | null {
  return listVirtualFiles(projectId).find((f) => f.id === id) ?? null;
}

export function getVirtualFileByPath(projectId: string, path: string): VirtualFile | null {
  return listVirtualFiles(projectId).find((f) => f.path === path) ?? null;
}

export function saveVirtualFile(file: VirtualFile): void {
  const all = readAll<VirtualFile>(storeKey(file.projectId)).filter((f) => f.id !== file.id);
  writeAll(storeKey(file.projectId), [...all, file].sort((a, b) => a.path.localeCompare(b.path)));
}

export function createVirtualFile(input: CreateVirtualFileInput): VirtualFile {
  const now = new Date().toISOString();
  const file: VirtualFile = {
    id: uid(),
    projectId: input.projectId,
    name: input.name,
    path: input.path,
    isDirectory: false,
    content: input.content ?? "",
    language: input.language,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy ?? "ai",
  };
  saveVirtualFile(file);
  // Ensure parent directories exist
  ensureParentDirs(input.projectId, input.path);
  return file;
}

export function updateVirtualFile(projectId: string, id: string, patch: Partial<VirtualFile>): void {
  const file = getVirtualFile(projectId, id);
  if (!file) return;
  const updated = { ...file, ...patch, updatedAt: new Date().toISOString() };
  saveVirtualFile(updated);
}

export function deleteVirtualFile(projectId: string, id: string): void {
  const all = readAll<VirtualFile>(storeKey(projectId)).filter((f) => f.id !== id);
  writeAll(storeKey(projectId), all);
}

export function deleteVirtualDirectory(projectId: string, dirPath: string): void {
  const all = readAll<VirtualFile>(storeKey(projectId)).filter(
    (f) => f.path !== dirPath && !f.path.startsWith(dirPath + "/"),
  );
  writeAll(storeKey(projectId), all);
}

function ensureParentDirs(projectId: string, filePath: string): void {
  const parts = filePath.split("/").slice(0, -1);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!getVirtualFileByPath(projectId, current)) {
      const dir: VirtualFile = {
        id: uid(),
        projectId,
        name: part,
        path: current,
        isDirectory: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "ai",
      };
      saveVirtualFile(dir);
    }
  }
}

export function getDirectoryTree(projectId: string): VirtualFile[] {
  return listVirtualFiles(projectId).filter((f) => f.isDirectory);
}