/**
 * Virtual file system entry — either a file or directory.
 * Stored per-project in localStorage.
 */
export interface VirtualFile {
  id: string;
  projectId: string;
  name: string;
  path: string;           // e.g. "src/components/LoginForm.tsx"
  isDirectory: boolean;
  content?: string;       // only for files
  language?: string;      // for syntax highlighting
  createdAt: string;
  updatedAt: string;
  createdBy: "user" | "ai";
}

export interface CreateVirtualFileInput {
  projectId: string;
  name: string;
  path: string;
  content: string;
  language?: string;
  createdBy?: "user" | "ai";
  isDirectory?: boolean;
}