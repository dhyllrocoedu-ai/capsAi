import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  File,
  Folder,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useProjectStore } from "@/lib/stores/projectStore";
import { listVirtualFiles, createVirtualFile, updateVirtualFile, deleteVirtualFile } from "@/lib/repositories/virtualFileRepo";
import type { VirtualFile } from "@/types";
import { cn } from "@/lib/utils";

export function ProjectCodePage() {
  const { projectId } = useParams({ from: "/app/projects/$projectId" });
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((p) => p.id === projectId);

  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [search, setSearch] = useState("");
  const [newFileModal, setNewFileModal] = useState<{ path: string } | null>(null);
  const [newFolderModal, setNewFolderModal] = useState<{ parentPath: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ file: VirtualFile } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  useEffect(() => {
    refreshFiles();
  }, [projectId]);

  useEffect(() => {
    if (selectedFile) {
      setFileContent(selectedFile.content ?? "");
      setSaveStatus("saved");
    }
  }, [selectedFile]);

  const refreshFiles = () => {
    if (!projectId) return;
    setFiles(listVirtualFiles(projectId));
  };

  const filteredFiles = files
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.path.localeCompare(b.path);
    });

  const selectFile = (file: VirtualFile) => {
    if (file.isDirectory) return;
    setSelectedFile(file);
    setFileContent(file.content ?? "");
    setSaveStatus("saved");
  };

  const handleSave = () => {
    if (!selectedFile || !projectId) return;
    setSaveStatus("saving");
    updateVirtualFile(projectId, selectedFile.id, { content: fileContent, updatedAt: new Date().toISOString() });
    setFiles((prev) => prev.map((f) => (f.id === selectedFile.id ? { ...f, content: fileContent } : f)));
    setSaveStatus("saved");
  };

  const handleNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileModal || !projectId) return;
    const path = newFileModal.path.trim();
    if (!path) return;
    createVirtualFile({ projectId, name: path.split("/").pop() || path, path, content: "", createdBy: "user" });
    refreshFiles();
    setNewFileModal(null);
  };

  const handleNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderModal || !projectId) return;
    const path = newFolderModal.parentPath.trim();
    if (!path) return;
    const folderName = prompt("Folder name:");
    if (!folderName) return;
    const fullPath = path ? `${path}/${folderName}` : folderName;
    createVirtualFile({ projectId, name: folderName, path: fullPath, isDirectory: true, content: "", createdBy: "user" });
    refreshFiles();
    setNewFolderModal(null);
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModal || !projectId) return;
    const newName = prompt("New name:", renameModal.file.name);
    if (!newName) return;
    const newPath = renameModal.file.path.replace(renameModal.file.name, newName);
    updateVirtualFile(projectId, renameModal.file.id, { name: newName, path: newPath });
    refreshFiles();
    setRenameModal(null);
  };

  const handleDelete = (file: VirtualFile) => {
    if (!confirm(`Delete ${file.path}?`)) return;
    if (file.isDirectory) {
      deleteVirtualFile(projectId!, file.id); // simplified
    } else {
      deleteVirtualFile(projectId!, file.id);
    }
    if (selectedFile?.id === file.id) setSelectedFile(null);
    refreshFiles();
  };

  const getFileIcon = (file: VirtualFile) => {
    if (file.isDirectory) return <Folder className="h-4 w-4 text-amber-500" />;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (["ts", "tsx", "js", "jsx"].includes(ext || "")) return <File className="h-4 w-4 text-blue-500" />;
    if (["py"].includes(ext || "")) return <File className="h-4 w-4 text-yellow-500" />;
    if (["json"].includes(ext || "")) return <File className="h-4 w-4 text-green-500" />;
    if (["md", "mdx"].includes(ext || "")) return <File className="h-4 w-4 text-purple-500" />;
    if (["sql"].includes(ext || "")) return <File className="h-4 w-4 text-orange-500" />;
    return <File className="h-4 w-4 text-surface-500" />;
  };

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <p className="text-sm text-surface-500">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <button
        onClick={() => void navigate({ to: "/app/projects" })}
        className="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> All projects
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{project.title}</h1>
          <p className="text-xs text-surface-500">Code workspace — virtual file system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setNewFileModal({ path: "" })}>
            <Plus className="h-3.5 w-3.5" /> New File
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setNewFolderModal({ parentPath: "" })}>
            <Plus className="h-3.5 w-3.5" /> New Folder
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-280px)] gap-4">
        {/* File tree */}
        <Card className="w-72 shrink-0 flex flex-col">
          <CardHeader
            title="Files"
            subtitle="Search and manage files"
            action={
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-surface-400" />
                <Input
                  placeholder="Search files…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 text-[11px]"
                />
              </div>
            }
          />
          <CardContent className="flex-1 overflow-y-auto p-0">
            <ul className="py-2">
              {filteredFiles.length === 0 ? (
                <li className="px-3 py-8 text-center text-xs text-surface-400">
                  No files yet. Create your first file!
                </li>
              ) : (
                filteredFiles.map((file) => (
                  <li
                    key={file.id}
                    className={cn(
                      "relative px-2 py-1.5 text-sm cursor-pointer select-none transition-colors",
                      selectedFile?.id === file.id
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50"
                        : "hover:bg-surface-100 dark:hover:bg-surface-800",
                    )}
                    onClick={() => selectFile(file)}
                  >
                    <div className="flex items-center gap-1.5">
                      {getFileIcon(file)}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
                      {!file.isDirectory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameModal({ file });
                          }}
                          className="p-1 text-[10px] text-surface-500 hover:text-surface-700"
                          title="Rename"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file);
                        }}
                        className="p-1 text-[10px] text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="flex-1 flex flex-col min-w-0">
          <CardHeader
            title={selectedFile ? selectedFile.path : "Select a file to edit"}
            action={
              selectedFile && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className={saveStatus === "unsaved" ? "bg-brand-600" : ""}
                >
                  {saveStatus === "saving" ? "Saving…" : saveStatus === "unsaved" ? "Save" : "Saved"}
                </Button>
              )
            }
          />
          <CardContent className="flex-1 p-0 relative">
            {selectedFile ? (
              <textarea
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  setSaveStatus("unsaved");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    setFileContent(
                      fileContent.substring(0, start) + "  " + fileContent.substring(end),
                    );
                    setTimeout(() => {
                      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                    }, 0);
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className="w-full h-full p-4 font-mono text-sm bg-transparent resize-none focus:outline-none"
                spellCheck={false}
                placeholder="Select a file or create a new one…"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-surface-400">
                <p className="text-sm">Select a file from the left to start editing</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <Modal open={!!newFileModal} onClose={() => setNewFileModal(null)} title="New File" wide>
        <form onSubmit={handleNewFile} className="space-y-3">
          <Input
            label="File path"
            placeholder="src/components/Button.tsx"
            value={newFileModal?.path || ""}
            onChange={(e) => setNewFileModal({ ...newFileModal!, path: e.target.value })}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setNewFileModal(null)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!newFolderModal} onClose={() => setNewFolderModal(null)} title="New Folder">
        <form onSubmit={handleNewFolder} className="space-y-3">
          <Input
            label="Parent path (empty for root)"
            placeholder="src/components"
            value={newFolderModal?.parentPath || ""}
            onChange={(e) => setNewFolderModal({ ...newFolderModal!, parentPath: e.target.value })}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setNewFolderModal(null)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!renameModal} onClose={() => setRenameModal(null)} title="Rename File">
        <form onSubmit={handleRename} className="space-y-3">
          <p className="text-sm text-surface-500">Current: {renameModal?.file.path}</p>
          <Input label="New name" placeholder="NewFileName.tsx" autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRenameModal(null)}>
              Cancel
            </Button>
            <Button type="submit">Rename</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}