import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import {
  BotMessageSquare,
  MessageSquarePlus,
  Send,
  Square,
  Trash2,
  Menu,
  X,
  Bot,
  FileCode,
  Loader2,
  Check,
  Save,
  X as XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  ADVISER_MODES,
  ADVISER_MODE_LABELS,
  type AIMessage,
  type AdviserMode,
  type UsageStatus,
  type AdviserConversation,
} from "@/types";
import { getAIProvider } from "@/services/ai";
import type { ProjectContextInput } from "@/services/ai/prompts";
import { NIVIDA_MODELS } from "@/services/ai/models";
import { buildDocumentContext } from "@/services/ai/documentContext";
import { Markdown } from "@/components/ui/Markdown";
import { aiChatStream, QuotaError } from "@/lib/api/ai";
import { UsageMeter, QuotaBlockedCard } from "@/components/ai/UsageMeter";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { logActivity, getProfile } from "@/lib/repositories/projectRepo";
import {
  listConversations,
  saveConversation,
  createConversation,
  deleteConversation,
} from "@/lib/repositories/conversationRepo";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/repositories/baseRepo";
import { createAIGeneratedFile } from "@/lib/repositories/aiFileRepo";
import { createVirtualFile } from "@/lib/repositories/virtualFileRepo";

interface ChatTurn extends AIMessage {}

function welcome(mode: AdviserMode): string {
  return `I'm your ${ADVISER_MODE_LABELS[mode].toLowerCase()}. I can see your active project profile.

Ask me anything about your capstone — or ask me to interview you about your problem, objectives, or methodology so we can strengthen them together.`;
}

export function AIAdviserPage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const user = useAuthStore((s) => s.user);
  const project = projects.find(
    (p) => p.id === (params.projectId ?? activeProjectId),
  );

  const profile = useMemo(
    () => (project ? getProfile(project.id) : null),
    [project?.id],
  );

  const [mode, setMode] = useState<AdviserMode>("GENERAL_ADVISER");
  const [model, setModel] = useState<string | undefined>(undefined);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState<UsageStatus | null>(null);
  const [conversations, setConversations] = useState<AdviserConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveFileModal, setSaveFileModal] = useState<{
    content: string;
    language: string;
    messageId: string;
  } | null>(null);

  /** File generations in progress or awaiting review. */
  interface FileGeneration {
    id: string;
    title: string;
    language: string;
    content: string;
    status: "generating" | "ready" | "accepted" | "rejected";
  }
  const [fileGenerations, setFileGenerations] = useState<FileGeneration[]>([]);
  const [filePanelOpen, setFilePanelOpen] = useState(false);
  const [generateFileMode, setGenerateFileMode] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const provider = useMemo(() => getAIProvider(), []);
  const isMock = provider.name === "mock";

  // Load persisted conversations once on mount.
  useEffect(() => {
    setConversations(listConversations());
  }, []);

  useEffect(() => {
    setTurns([
      {
        id: uid(),
        role: "assistant",
        content: welcome("GENERAL_ADVISER"),
        createdAt: new Date().toISOString(),
      },
    ]);
    setActiveConversationId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Create a project first so the adviser knows what it's advising on.
        </p>
      </div>
    );
  }

  // Persist the latest assistant content into the active conversation.
  const persistActive = (
    activeId: string | null,
    nextTurns: ChatTurn[],
    convMode: string,
  ) => {
    if (!activeId) return;
    const now = new Date().toISOString();
    saveConversation({
      id: activeId,
      title:
        conversations.find((c) => c.id === activeId)?.title ??
        summarize(nextTurns[2]?.content ?? "New conversation"),
      mode: convMode,
      turns: nextTurns.filter((t) => t.role !== "system"),
      createdAt: conversations.find((c) => c.id === activeId)?.createdAt ?? now,
      updatedAt: now,
    });
    setConversations(listConversations());
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setQuotaBlocked(null);
    setInput("");

    // First message of a new thread -> create a conversation.
    let threadId = activeConversationId;
    if (!threadId) {
      const created = createConversation(mode, text);
      threadId = created.id;
      setActiveConversationId(threadId);
      setConversations((prev) => [created, ...prev]);
    }

const userTurn: ChatTurn = {
        id: uid(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      const history = [...turns, userTurn];
      setTurns([...history]);
      setLoading(true);

      // Auto-detect file generation request
      const fileGenKeywords = [
        "create a file",
        "generate a file",
        "write a file",
        "make a file",
        "create component",
        "generate component",
        "write component",
        "create function",
        "generate function",
        "write function",
        "create class",
        "generate class",
        "write class",
        "create hook",
        "generate hook",
        "write hook",
        "create script",
        "generate script",
        "write script",
      ];
      const wantsFile = fileGenKeywords.some((kw) => text.toLowerCase().includes(kw));
      const shouldGenerateFile = wantsFile || generateFileMode;

      abortRef.current = new AbortController();

      try {
        // Project knowledge context sent alongside the adviser system prompt.
        const projectContext: ProjectContextInput = {
          title: project.title,
          courseProgram: project.courseProgram,
          institution: project.institution,
          problemStatement: profile?.problemStatement ?? "",
          proposedSystem: profile?.proposedSystem ?? "",
          primaryUsers: profile?.primaryUsers ?? "",
          majorFeatures: profile?.majorFeatures ?? [],
          technologies: profile?.technologies ?? [],
          generalObjective: profile?.generalObjective ?? "",
          specificObjectives: profile?.specificObjectives ?? [],
          methodology: profile?.methodology ?? null,
          // Include existing chapter content so the adviser can review and
          // suggest changes to what the student has actually written.
          documentContext: buildDocumentContext(project.id),
        };

        if (shouldGenerateFile) {
        // FILE GENERATION MODE: stream into a file panel, not chat
        const fileId = uid();
        const fileTitle = text.slice(0, 50) || "Generated file";
        
        // Create file generation entry
        setFileGenerations((prev) => [
          ...prev,
          { id: fileId, title: fileTitle, language: "typescript", content: "", status: "generating" },
        ]);
        setFilePanelOpen(true);
        setGenerateFileMode(false);

        // Add a brief note to chat
        const noteId = uid();
        setTurns((prev) => [
          ...prev,
          {
            id: noteId,
            role: "assistant",
            content: `📄 Generating **${fileTitle}**… (see file panel →)`,
            createdAt: new Date().toISOString(),
          },
        ]);

        await aiChatStream(
          {
            mode: "CHAPTER_ASSISTANT",
            model,
            messages: history.map((t) => ({ role: t.role, content: t.content })),
          },
          projectContext,
          (delta) => {
            setFileGenerations((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, content: f.content + delta } : f,
              ),
            );
          },
          abortRef.current.signal,
        );

        // Mark as ready
        setFileGenerations((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, status: "ready" } : f,
          ),
        );

        // Update chat note
        setTurns((prev) =>
          prev.map((t) =>
            t.id === noteId
              ? { ...t, content: `📄 Generated **${fileTitle}** — ready in file panel →` }
              : t,
          ),
        );
        persistActive(threadId, turns, mode);
      } else {
        // NORMAL CHAT MODE
        const assistantId = uid();
        setTurns((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
        ]);

        await aiChatStream(
          {
            mode,
            model,
            messages: history.map((t) => ({ role: t.role, content: t.content })),
          },
          projectContext,
          (delta) => {
            setTurns((prev) => {
              const updated = prev.map((t) =>
                t.id === assistantId ? { ...t, content: t.content + delta } : t,
              );
              persistActive(threadId, updated, mode);
              return updated;
            });
          },
          abortRef.current.signal,
        );
      }

      if (user) {
        logActivity({
          userId: user.id,
          projectId: project.id,
          type: "ai_chat",
          description: `Consulted the ${ADVISER_MODE_LABELS[mode].toLowerCase()} (${provider.name})`,
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (err instanceof QuotaError) {
        setQuotaBlocked(err.usage);
        setTurns((prev) => prev.filter((t) => t.content !== "" || t.role !== "assistant"));
        persistActive(threadId, turns, mode);
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "The AI adviser is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const openConversation = (c: AdviserConversation) => {
    setActiveConversationId(c.id);
    setMode(c.mode as AdviserMode);
    setTurns(c.turns as ChatTurn[]);
    setError(null);
    setQuotaBlocked(null);
    setSidebarOpen(false);
  };

  const startNew = () => {
    setTurns([
      {
        id: uid(),
        role: "assistant",
        content: welcome(mode),
        createdAt: new Date().toISOString(),
      },
    ]);
    setActiveConversationId(null);
    setError(null);
    setQuotaBlocked(null);
    setSidebarOpen(false);
  };

  const removeConversation = (id: string) => {
    deleteConversation(id);
    if (activeConversationId === id) startNew();
    setConversations(listConversations());
  };

  /** Extract fenced code blocks from markdown content. */
  function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const blocks: Array<{ language: string; code: string }> = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({ language: match[1] || "text", code: match[2].trim() });
    }
    return blocks;
  }

  function guessFileType(language: string): "code" | "documentation" | "research" | "other" {
    const codeLangs = [
      "typescript", "javascript", "tsx", "jsx", "python", "java", "csharp", "cpp",
      "c", "go", "rust", "php", "ruby", "swift", "kotlin", "sql", "html", "css",
      "json", "yaml", "toml", "dockerfile", "bash", "sh", "powershell",
    ];
    const docLangs = ["markdown", "md", "mdx", "txt", "rst", "latex", "tex"];
    const researchLangs = ["bib", "bibtex", "csl", "ris"];
    if (codeLangs.includes(language.toLowerCase())) return "code";
    if (docLangs.includes(language.toLowerCase())) return "documentation";
    if (researchLangs.includes(language.toLowerCase())) return "research";
    return "other";
  }

  function guessTitleFromCode(code: string, language: string): string {
    const lines = code.trim().split("\n");
    // Try to find a function/class/component name
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();
      const match = trimmed.match(
        /(?:function|const|class|interface|type|export)\s+(\w+)/
      );
      if (match) return `${match[1]}.${language}`;
    }
    return `snippet.${language}`;
  }

  function guessPath(fileType: string, title: string): string {
    if (fileType === "code") return `src/${title}`;
    if (fileType === "documentation") return `docs/${title}`;
    return `generated/${title}`;
  }

  const handleSaveAsFile = (
    messageId: string,
    content: string,
    language: string
  ) => {
    const fileType = guessFileType(language);
    const title = guessTitleFromCode(content, language);
    const suggestedPath = guessPath(fileType, title);

    createAIGeneratedFile({
      projectId: project.id,
      title,
      description: `Generated by AI Adviser (${ADVISER_MODE_LABELS[mode]})`,
      content,
      language,
      fileType,
      suggestedPath,
      createdByMessageId: messageId,
    });

    setSaveFileModal(null);
  };

  const headerAction = !activeConversationId && turns.length <= 1;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "z-20 flex w-64 shrink-0 flex-col border-r border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-900 transition-transform",
          "fixed inset-y-0 left-0 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="secondary"
            className="flex-1 justify-start"
            onClick={startNew}
          >
            <MessageSquarePlus className="h-4 w-4" /> New chat
          </Button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-surface-400">
              Your past conversations will appear here.
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                c.id === activeConversationId
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                  : "text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800",
              )}
              onClick={() => openConversation(c)}
            >
              <Bot className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              <button
                type="button"
                aria-label="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  removeConversation(c.id);
                }}
                className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-200 dark:hover:bg-surface-700"
              >
                <Trash2 className="h-3.5 w-3.5 text-surface-400" />
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mask for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat panel */}
      <div className="mx-auto flex h-full max-w-3xl flex-1 flex-col p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg border border-surface-200 p-2 text-surface-500 hover:bg-surface-100 lg:hidden dark:border-surface-700 dark:hover:bg-surface-800"
              aria-label="Toggle menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <BotMessageSquare className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden />
                AI Capstone Adviser
              </h1>
              <p className="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-400">
                Advising on: <span className="font-medium">{project.title}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UsageMeter />
            {isMock && <Badge tone="warning">Mock mode — no API key</Badge>}
            <Select
              aria-label="Adviser mode"
              className="h-8 w-auto text-xs"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as AdviserMode);
                if (headerAction && !activeConversationId) {
                  setTurns([
                    {
                      id: uid(),
                      role: "assistant",
                      content: welcome(e.target.value as AdviserMode),
                      createdAt: new Date().toISOString(),
                    },
                  ]);
                }
              }}
            >
              {ADVISER_MODES.map((m) => (
                <option key={m} value={m}>
                  {ADVISER_MODE_LABELS[m]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="AI model"
              className="h-8 w-auto max-w-[200px] text-xs"
              value={model ?? ""}
              onChange={(e) => setModel(e.target.value || undefined)}
            >
              <option value="">Auto (recommended)</option>
              {NIVIDA_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
          {turns.map((t) => {
            const codeBlocks = t.role === "assistant" ? extractCodeBlocks(t.content) : [];
            return (
              <div
                key={t.id}
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                  t.role === "user"
                    ? "ml-auto bg-brand-600 text-white"
                    : "bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-100",
                )}
              >
                {t.role === "assistant" ? (
                  <Markdown content={t.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{t.content}</p>
                )}
                {codeBlocks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {codeBlocks.slice(0, 3).map((block, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSaveFileModal({ content: block.code, language: block.language, messageId: t.id })}
                        className="rounded-md border border-surface-300 bg-white px-2.5 py-1 text-[11px] font-medium text-surface-600 hover:bg-surface-100 hover:border-brand-300 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                      >
                        Save as {block.language || "text"} file
                      </button>
                    ))}
                    {codeBlocks.length > 3 && (
                      <span className="text-[11px] text-surface-500">
                        +{codeBlocks.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (turns[turns.length - 1]?.content ?? "") === "" && (
            <div className="flex items-center gap-2 px-1 text-xs text-surface-400">
              <span className="flex gap-1" aria-hidden>
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </span>
              The adviser is thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quota block */}
        {quotaBlocked && (
          <div className="mt-2">
            <QuotaBlockedCard
              message="You've used today's free AI credits."
              tier={quotaBlocked.tier}
              onDismiss={() => setQuotaBlocked(null)}
            />
          </div>
        )}

        {/* Save as file modal */}
        {saveFileModal && (
          <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950/40">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
                  Save AI response as file?
                </p>
                <p className="mt-0.5 text-xs text-brand-700 dark:text-brand-300">
                  Review the code below, adjust if needed, then save to your project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaveFileModal(null)}
                className="rounded-md p-1 text-brand-500 hover:bg-brand-100 dark:hover:bg-brand-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-900 max-h-64 overflow-auto">
              <pre className="text-[11px] text-surface-800 dark:text-surface-100 whitespace-pre-wrap overflow-x-auto">{saveFileModal.content}</pre>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={saveFileModal.language}
                onChange={(e) => setSaveFileModal({ ...saveFileModal, language: e.target.value })}
                className="flex-1 rounded-lg border border-surface-300 bg-white px-2 py-1.5 text-[11px] text-surface-800 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
              >
                {[
                  "typescript",
                  "javascript",
                  "python",
                  "sql",
                  "markdown",
                  "json",
                  "yaml",
                  "html",
                  "css",
                  "text",
                ].map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSaveFileModal(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveAsFile(saveFileModal.messageId, saveFileModal.content, saveFileModal.language)}
              >
                Save to project
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/60 dark:text-red-400"
          >
            {error}
          </p>
        )}

        {/* Composer */}
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder={generateFileMode ? "Describe the file to generate…" : "Ask about your objectives, methodology, scope…"}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-surface-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900"
            disabled={loading}
          />
          <Button
            type="button"
            variant={generateFileMode ? "primary" : "secondary"}
            size="sm"
            onClick={() => setGenerateFileMode((v) => !v)}
            className="h-9"
            title={generateFileMode ? "Switch to chat mode" : "Generate file instead of chat"}
          >
            <FileCode className="h-4 w-4" />
          </Button>
          {loading ? (
            <Button type="button" variant="secondary" onClick={cancel}>
              <Square className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <Send className="h-4 w-4" /> Send
            </Button>
          )}
        </form>
        <p className="mt-1.5 text-center text-[10px] text-surface-400">
          The adviser guides and suggests — always verify facts against real sources.
        </p>
      </div>

      {/* Right: File generations panel */}
      <aside
        className={cn(
          "z-20 flex w-80 shrink-0 flex-col border-l border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-900",
          "fixed inset-y-0 right-0 lg:static lg:translate-x-0 transition-transform",
          filePanelOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-600 dark:text-surface-300">
            File Generations
          </h3>
          <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[10px] font-medium tabular-nums text-surface-600 dark:bg-surface-800 dark:text-surface-300">
            {fileGenerations.length}
          </span>
          <button
            type="button"
            onClick={() => setFilePanelOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
            aria-label="Close file panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
          {fileGenerations.length === 0 && (
            <p className="py-8 text-center text-xs text-surface-400">
              Click the <FileCode className="inline h-3 w-3" /> button and send a message to generate a file.
            </p>
          )}

          {fileGenerations.map((fg) => (
            <div
              key={fg.id}
              className="rounded-lg border border-surface-200 bg-white p-3 dark:border-surface-800 dark:bg-surface-900"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-surface-800 dark:text-surface-100">
                    {fg.title}
                  </p>
                  <p className="text-[10px] text-surface-500">{fg.language}</p>
                </div>
                {fg.status === "generating" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
                )}
                {fg.status === "ready" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              </div>

              <pre className="mt-2 max-h-48 overflow-auto rounded bg-surface-100 p-2 text-[10px] whitespace-pre-wrap dark:bg-surface-800">
                {fg.content || (fg.status === "generating" ? "Generating…" : "")}
              </pre>

              {fg.status === "ready" && (
                <div className="mt-2 flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setFileGenerations((prev) => prev.filter((f) => f.id !== fg.id))}
                  >
                    <XIcon className="h-3 w-3" /> Discard
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      // Write to virtual filesystem
                      const suggestedPath = guessPath(guessFileType(fg.language), fg.title);
                      createVirtualFile({
                        projectId: project.id,
                        name: fg.title,
                        path: suggestedPath,
                        content: fg.content,
                        language: fg.language,
                        createdBy: "ai",
                      });
                      // Also track as AI-generated file for review
                      createAIGeneratedFile({
                        projectId: project.id,
                        title: fg.title,
                        description: `Generated by AI Adviser (${ADVISER_MODE_LABELS[mode]})`,
                        content: fg.content,
                        language: fg.language,
                        fileType: guessFileType(fg.language),
                        suggestedPath,
                        createdByMessageId: fg.id,
                      });
                      setFileGenerations((prev) => prev.filter((f) => f.id !== fg.id));
                    }}
                  >
                    <Save className="h-3 w-3" /> Apply to project
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* File panel toggle button (visible when panel is closed) */}
      {!filePanelOpen && fileGenerations.length > 0 && (
        <button
          type="button"
          onClick={() => setFilePanelOpen(true)}
          className="fixed right-4 bottom-20 z-30 rounded-full border border-surface-200 bg-white p-2 shadow-lg hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 lg:right-6 dark:hover:bg-surface-700"
          aria-label="Open file panel"
        >
          <FileCode className="h-4 w-4 text-brand-600" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            {fileGenerations.length}
          </span>
        </button>
      )}

      {/* Mask for mobile drawer */}
      {filePanelOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/30 lg:hidden"
          onClick={() => setFilePanelOpen(false)}
        />
      )}
    </div>
  );
}

function summarize(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 40 ? `${clean.slice(0, 40).trimEnd()}…` : clean || "New conversation";
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-surface-400"
      style={{ animationDelay: delay }}
    />
  );
}
