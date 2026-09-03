import { useState } from "react";
import {
  BotMessageSquare,
  Check,
  Clipboard,
  PenLine,
  Sparkles,
  WrapText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  aiGenerate,
  aiReview,
  aiChat,
  QuotaError,
  type AIReviewRequest,
} from "@/lib/api/ai";
import type { ProjectContextInput } from "@/services/ai/prompts";
import type { UsageStatus } from "@/types";
import { QuotaBlockedCard } from "@/components/ai/UsageMeter";

type Action = "generate" | "improve" | "expand" | "review";

const ACTIONS: Array<{ key: Action; label: string; icon: typeof Sparkles; hint: string }> = [
  { key: "generate", label: "Generate draft", icon: Sparkles, hint: "Write a full first draft for the current section." },
  {
    key: "improve",
    label: "Improve",
    icon: PenLine,
    hint: "Polish clarity, flow, and academic tone while keeping meaning.",
  },
  {
    key: "expand",
    label: "Expand",
    icon: WrapText,
    hint: "Add depth, examples, and supporting discussion.",
  },
  {
    key: "review",
    label: "Review",
    icon: BotMessageSquare,
    hint: "Get alignment score + improvement suggestions from the panel-simulator.",
  },
];

interface Props {
  sectionTitle: string;
  sectionHtml: string;
  projectTitle: string;
  hasProfile: boolean;
  onInsert: (html: string) => void;
}

export function AIActionPanel({ sectionTitle, sectionHtml, projectTitle, hasProfile, onInsert }: Props) {
  const [action, setAction] = useState<Action>("generate");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<{
    score: number;
    summary: string;
    criticalIssues: string[];
    warnings: string[];
    suggestions: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [quota, setQuota] = useState<UsageStatus | null>(null);

  const ctx: ProjectContextInput = {
    title: projectTitle,
    problemStatement: "",
    proposedSystem: "",
    primaryUsers: "",
    majorFeatures: [],
    technologies: [],
    generalObjective: "",
    specificObjectives: [],
    methodology: null,
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setReviewResult(null);

    try {
      if (action === "generate") {
        const res = await aiGenerate({
          projectContext: ctx,
          sectionTitle,
          instructions: instructions || undefined,
        });
        setResult(res.assistant);
        return;
      }

      if (action === "review") {
        const payload: AIReviewRequest = {
          projectContext: ctx,
          reviewType: "FULL_CAPSTONE_REVIEW",
          chapterContent: sectionHtml
            ? [{ chapterNumber: 0, title: sectionTitle, html: sectionHtml }]
            : undefined,
        };
        const res = await aiReview(payload);
        setReviewResult(res);
        setResult(
          [
            `Score: ${res.score}/100`,
            "",
            res.summary,
            res.criticalIssues.length
              ? `\n\nCritical issues (${res.criticalIssues.length}):\n- ${res.criticalIssues.join("\n- ")}`
              : "",
            res.warnings.length
              ? `\n\nWarnings:\n- ${res.warnings.join("\n- ")}`
              : "",
            res.suggestions.length
              ? `\n\nSuggestions:\n- ${res.suggestions.join("\n- ")}`
              : "",
            res.strengths.length
              ? `\n\nStrengths:\n- ${res.strengths.join("\n- ")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );
        return;
      }

      // improve / expand
      const prompt =
        action === "improve"
          ? `Improve the clarity, flow, and academic tone of the following section text. Preserve the author's meaning. Only return the improved text.\n\n---\n${sectionHtml || ""}`
          : `Expand the following section with more depth. Add examples, supporting discussion, and transition sentences. Only return the expanded text.\n\n---\n${sectionHtml || ""}`;

      const response = await aiChat(
        { mode: "CHAPTER_ASSISTANT", messages: [{ role: "user", content: prompt }] },
        ctx,
      );
      setResult(response.content);
    } catch (err) {
      if (err instanceof QuotaError) {
        setQuota(err.usage);
        return;
      }
      setError(err instanceof Error ? err.message : "The AI writer is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const insert = () => {
    if (result) {
      onInsert(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeMeta = ACTIONS.find((a) => a.key === action);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
      <div className="border-b border-surface-200 px-3 py-2 dark:border-surface-800">
        <h3 className="text-xs font-semibold">AI Writing Panel</h3>
        <p className="mt-0.5 text-[10px] leading-relaxed text-surface-400">
          Suggestions are drafts — verify and adapt before submitting.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <Select
          aria-label="Action"
          className="h-8 text-xs"
          value={action}
          onChange={(e) => {
            setAction(e.target.value as Action);
            setResult(null);
            setReviewResult(null);
          }}
        >
          {ACTIONS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </Select>

        <p className="text-[11px] leading-relaxed text-surface-500 dark:text-surface-400">
          {activeMeta?.hint}
        </p>

        {!hasProfile && (
          <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Your project profile isn't filled in yet. The AI will guide more
            usefully after you complete the wizard.
          </p>
        )}

        <Textarea
          label={action === "generate" ? "Optional focus or context" : "Additional instructions (optional)"}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          placeholder={
            action === "generate"
              ? "e.g. focus this on students in a Philippine public university context"
              : "e.g. keep it concise and formal"
          }
        />

        <Button
          onClick={run}
          loading={loading}
          className="w-full"
          disabled={action === "review" ? false : !sectionTitle}
        >
          {loading ? "Working…" : activeMeta?.label ?? "Run"}
        </Button>

        {quota && (
          <QuotaBlockedCard
            message="You've used today's AI credits."
            tier={quota.tier}
            onDismiss={() => setQuota(null)}
          />
        )}

        {error && (
          <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-500">
                Result
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setResult(null)}>
                  Discard
                </Button>
                <Button size="sm" onClick={insert}>
                  {copied ? <><Check className="h-3 w-3" /> Inserted</> : <><Clipboard className="h-3 w-3" /> Insert into editor</>}
                </Button>
              </div>
            </div>

            {reviewResult && (
              <div className="flex flex-wrap items-center gap-2 border-b border-surface-100 pb-2 dark:border-surface-800">
                <span className="text-xs font-medium">Score</span>
                <span
                  className={`text-sm font-bold ${
                    reviewResult.score >= 85
                      ? "text-emerald-600"
                      : reviewResult.score >= 70
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {reviewResult.score}/100
                </span>
                <span className="text-[11px] text-surface-500 line-clamp-2">
                  {reviewResult.summary.slice(0, 120)}
                </span>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs leading-relaxed dark:border-surface-800 dark:bg-surface-950">
              <pre className="whitespace-pre-wrap font-sans">{result}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}