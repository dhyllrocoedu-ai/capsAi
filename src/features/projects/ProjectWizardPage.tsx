import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BotMessageSquare,
  CheckCircle2,
  FileText,
  Lightbulb,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { type ProjectProfile } from "@/types";
import { emptyProjectProfile } from "@/types";
import { getProfile, saveProfile } from "@/lib/repositories/projectRepo";
import { getAIProvider, buildSystemPrompt, buildProjectContext } from "@/services/ai";
import {
  analyzeWizardProfile,
  autofillWizardProfile,
  getWizardQuestions,
  type WizardAnalysis,
  type WizardQuestion,
} from "@/services/thesis/wizardAi";
import { useAuthStore } from "@/lib/stores/authStore";
import { DynamicFieldList } from "@/features/projects/DynamicFieldList";

type WizardStep =
  | "problem"
  | "solution"
  | "objectives"
  | "scope"
  | "methodology"
  | "summary";

interface StepMeta {
  key: WizardStep;
  label: string;
  icon: typeof Target;
  short: string;
}

const STEPS: StepMeta[] = [
  { key: "problem", label: "Problem", icon: Target, short: "Problem" },
  { key: "solution", label: "Solution", icon: Lightbulb, short: "Solution" },
  {
    key: "objectives",
    label: "Objectives",
    icon: Users,
    short: "Objectives",
  },
  { key: "scope", label: "Scope", icon: Target, short: "Scope" },
  {
    key: "methodology",
    label: "Methodology",
    icon: Workflow,
    short: "Methodology",
  },
  {
    key: "summary",
    label: "Summary",
    icon: CheckCircle2,
    short: "Summary",
  },
];

export function ProjectWizardPage() {
  const { projectId } = useParams({ from: "/app/projects/$projectId/wizard" });
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  void user;

  const [step, setStep] = useState<WizardStep>("problem");
  const [profile, setProfile] = useState<ProjectProfile>(() => {
    const stored = projectId ? getProfile(projectId) : null;
    return stored ?? emptyProjectProfile(projectId ?? "");
  });
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI suggestions state
  const [aiAnalysis, setAiAnalysis] = useState<WizardAnalysis | null>(null);
  const [aiQuestions, setAiQuestions] = useState<WizardQuestion[]>([]);
  const [aiLoading, setAiLoading] = useState<"analyze" | "autofill" | "questions" | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const pct = useMemo(() => profilePercent(profile), [profile]);

  useEffect(() => {
    if (!projectId) return;
    const fresh = getProfile(projectId);
    if (fresh) setProfile(fresh);
  }, [projectId]);

  const patch = <K extends keyof ProjectProfile>(key: K, value: ProjectProfile[K]) => {
    setProfile((prev) => {
      const next = { ...prev, [key]: value, updatedAt: new Date().toISOString() };
      if (projectId) saveProfile(next);
      return next;
    });
  };

  const persist = () => {
    if (!projectId) return;
    setSaving(true);
    saveProfile(profile);
    setTimeout(() => setSaving(false), 400);
  };

  // --- AI Wizard helpers ---
  const runAnalyze = async () => {
    setAiLoading("analyze");
    setShowAiPanel(true);
    const result = await analyzeWizardProfile(profile as unknown as Record<string, unknown>, step);
    setAiLoading(null);
    if ("error" in result) {
      console.error("Analysis failed:", result.error);
    } else {
      setAiAnalysis(result);
      setAiQuestions([]);
    }
  };

  const runAutofill = async () => {
    setAiLoading("autofill");
    setShowAiPanel(true);
    const result = await autofillWizardProfile(profile as unknown as Record<string, unknown>, step);
    setAiLoading(null);
    if ("error" in result) {
      console.error("Autofill failed:", result.error);
    } else {
      // Apply all suggested values to the profile
      setProfile((prev) => {
        let next = { ...prev, updatedAt: new Date().toISOString() };
        for (const [field, { value }] of Object.entries(result)) {
          // @ts-expect-error dynamic field assignment
          if (field in next && value) next[field] = value;
        }
        if (projectId) saveProfile(next);
        return next;
      });
    }
  };

  const runQuestions = async () => {
    setAiLoading("questions");
    setShowAiPanel(true);
    const result = await getWizardQuestions(profile as unknown as Record<string, unknown>, step);
    setAiLoading(null);
    if ("error" in result) {
      console.error("Questions failed:", result.error);
    } else {
      setAiQuestions(result);
      setAiAnalysis(null);
    }
  };

  const applyAiQuestion = (question: WizardQuestion, choiceValue: string) => {
    setProfile((prev) => {
      const next = { ...prev, [question.field]: choiceValue, updatedAt: new Date().toISOString() };
      if (projectId) saveProfile(next);
      return next;
    });
    setAiQuestions((prev) => prev.filter((q) => q.field !== question.field));
  };

  const dismissAiSuggestion = (field: string) => {
    setAiAnalysis((prev) => {
      if (!prev) return null;
      const { fieldSuggestions, ...rest } = prev;
      const { [field]: _, ...remaining } = fieldSuggestions;
      return { ...rest, fieldSuggestions: remaining };
    });
  };

  const dismissAiQuestion = (field: string) => {
    setAiQuestions((prev) => prev.filter((q) => q.field !== field));
  };

  const runSummary = async () => {
    setSummarizing(true);
    try {
      const provider = getAIProvider();
      const ctx = toContext(profile);
      const system = buildSystemPrompt("GENERAL_ADVISER");
      const response = await provider.chat({
        mode: "GENERAL_ADVISER",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              buildProjectContext(ctx),
              "Task: Briefly summarize this project profile in 6-8 bullets.",
              "Point out the ONE biggest gap or missing piece a panel would ask about.",
            ].join("\n"),
          },
        ],
      });
      setSummary(response.content);
    } catch {
      setSummary(
        "Unable to generate a summary right now. Verify your answers above and proceed — you can review later.",
      );
    } finally {
      setSummarizing(false);
    }
  };

  const next = () => {
    persist();
    if (step === "methodology") setStep("summary");
    else {
      const nextKey = STEPS[stepIndex + 1]?.key;
      if (nextKey) setStep(nextKey);
    }
  };

  const prev = () => {
    const prevKey = STEPS[stepIndex - 1]?.key;
    if (prevKey) setStep(prevKey);
  };

  if (!projectId) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Create a project first.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/app/projects" })}>
          <ArrowLeft className="h-4 w-4" /> Projects
        </Button>
      </div>
      <h1 className="mb-1 text-lg font-bold tracking-tight">Project Knowledge Profile</h1>
      <p className="mb-5 text-xs text-surface-500 dark:text-surface-400">
        These answers become the context for your AI adviser, chapter auto-suggestions,
        and alignment checks. Every step saves automatically.
      </p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => {
              if (i <= stepIndex || isStepEnoughComplete(s.key, profile)) {
                setStep(s.key);
              }
            }}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[10px] font-medium transition-colors"
            data-active={step === s.key ? "true" : undefined}
          >
            <s.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{s.short}</span>
            {i < STEPS.length - 1 && (
              <span className="mx-0.5 h-px flex-1 bg-surface-200 dark:bg-surface-700" aria-hidden />
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
        <span>
          Step {stepIndex + 1} of {STEPS.length}
        </span>
        <span>{pct}% complete</span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
        <div
          className="h-full rounded-full bg-brand-600 transition-all dark:bg-brand-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
        <Step
          step={step}
          profile={profile}
          patch={patch}
          onNext={next}
          onPrev={prev}
          onDone={() => {
            persist();
            void navigate({
              to: "/app/projects/$projectId",
              params: { projectId: projectId },
            });
          }}
          onViewDraft={() => {
            persist();
            void navigate({
              to: "/app/projects/$projectId/documentation",
              params: { projectId: projectId },
            });
          }}
          summary={summary}
          summarizing={summarizing}
          onRunSummary={runSummary}
          saving={saving}
          // AI props
          aiAnalysis={aiAnalysis}
          aiQuestions={aiQuestions}
          aiLoading={aiLoading}
          showAiPanel={showAiPanel}
          setShowAiPanel={setShowAiPanel}
          runAnalyze={runAnalyze}
          runAutofill={runAutofill}
          runQuestions={runQuestions}
          applyAiQuestion={applyAiQuestion}
          dismissAiSuggestion={dismissAiSuggestion}
          dismissAiQuestion={dismissAiQuestion}
        />
      </div>
    </div>
  );
}

function isStepEnoughComplete(step: WizardStep, p: ProjectProfile): boolean {
  switch (step) {
    case "problem":
      return !!p.problemStatement;
    case "solution":
      return !!p.proposedSystem;
    case "objectives":
      return !!p.generalObjective;
    case "scope":
      return p.scopeIncluded.length > 0;
    case "methodology":
      return !!p.methodology;
    default:
      return true;
  }
}

function profilePercent(p: ProjectProfile): number {
  const checks = [
    p.problemStatement,
    p.proposedSystem,
    p.primaryUsers,
    p.generalObjective,
    p.specificObjectives.length > 0,
    p.scopeIncluded.length > 0,
    p.methodology,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function toContext(p: ProjectProfile) {
  return {
    title: "",
    courseProgram: "",
    institution: "",
    problemStatement: p.problemStatement,
    proposedSystem: p.proposedSystem,
    primaryUsers: p.primaryUsers,
    majorFeatures: p.majorFeatures,
    technologies: p.technologies,
    generalObjective: p.generalObjective,
    specificObjectives: p.specificObjectives,
    methodology: p.methodology ?? undefined,
  } as const;
}

/* ---------------------------------------------------------------------------
   Steps
   --------------------------------------------------------------------------- */

function Step({
  step,
  profile,
  patch,
  onNext,
  onPrev,
  onDone,
  onViewDraft,
  summary,
  summarizing,
  onRunSummary,
  saving,
  // AI props
  aiAnalysis,
  aiQuestions,
  aiLoading,
  showAiPanel,
  setShowAiPanel,
  runAnalyze,
  runAutofill,
  runQuestions,
  applyAiQuestion,
  dismissAiSuggestion,
  dismissAiQuestion,
}: {
  step: WizardStep;
  profile: ProjectProfile;
  patch: <K extends keyof ProjectProfile>(key: K, value: ProjectProfile[K]) => void;
  onNext: () => void;
  onPrev: () => void;
  onDone: () => void;
  onViewDraft: () => void;
  summary: string | null;
  summarizing: boolean;
  onRunSummary: () => void;
  saving: boolean;
  // AI props
  aiAnalysis: import("@/services/thesis/wizardAi").WizardAnalysis | null;
  aiQuestions: import("@/services/thesis/wizardAi").WizardQuestion[];
  aiLoading: "analyze" | "autofill" | "questions" | null;
  showAiPanel: boolean;
  setShowAiPanel: (show: boolean) => void;
  runAnalyze: () => Promise<void>;
  runAutofill: () => Promise<void>;
  runQuestions: () => Promise<void>;
  applyAiQuestion: (question: import("@/services/thesis/wizardAi").WizardQuestion, choiceValue: string) => void;
  dismissAiSuggestion: (field: string) => void;
  dismissAiQuestion: (field: string) => void;
}) {
  const isLast = step === "summary";
  const isFirst = step === "problem";

  return (
    <div className="space-y-5">
      {step === "problem" && (
        <>
          <StepHeading
            title="Step 1 — The Problem"
            description="Help me understand the gap your system addresses."
          />
          <Textarea
            label="What specific problem does your project aim to solve?"
            value={profile.problemStatement}
            onChange={(e) => patch("problemStatement", e.target.value)}
            rows={4}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Who experiences this problem?"
              value={profile.whoExperiences}
              onChange={(e) => patch("whoExperiences", e.target.value)}
            />
            <Input
              label="Where does the problem occur?"
              value={profile.whereOccurs}
              onChange={(e) => patch("whereOccurs", e.target.value)}
            />
          </div>
          <Textarea
            label="How is the problem currently handled?"
            value={profile.currentProcess}
            onChange={(e) => patch("currentProcess", e.target.value)}
            rows={3}
          />
          <Textarea
            label="What are the weaknesses of the current process?"
            value={profile.currentWeaknesses}
            onChange={(e) => patch("currentWeaknesses", e.target.value)}
            rows={3}
          />
        </>
      )}

      {step === "solution" && (
        <>
          <StepHeading
            title="Step 2 — Proposed Solution"
            description="Describe the system you want to build."
          />
          <Textarea
            label="Describe your proposed system."
            value={profile.proposedSystem}
            onChange={(e) => patch("proposedSystem", e.target.value)}
            rows={4}
          />
          <Input
            label="Who will use the system?"
            value={profile.primaryUsers}
            onChange={(e) => patch("primaryUsers", e.target.value)}
          />
          <DynamicFieldList
            label="Major features"
            items={profile.majorFeatures}
            onChange={(v) => patch("majorFeatures", v)}
          />
          <DynamicFieldList
            label="Technologies / platforms"
            items={profile.technologies}
            onChange={(v) => patch("technologies", v)}
          />
        </>
      )}

      {step === "objectives" && (
        <>
          <StepHeading
            title="Step 3 — Objectives"
            description="What exactly should your system achieve?"
          />
          <Textarea
            label="General objective"
            value={profile.generalObjective}
            onChange={(e) => patch("generalObjective", e.target.value)}
            rows={2}
          />
          <DynamicFieldList
            label="Specific objectives"
            items={profile.specificObjectives}
            onChange={(v) => patch("specificObjectives", v)}
          />
          <p className="text-[11px] leading-relaxed text-surface-500 dark:text-surface-400">
            Tip: each specific objective should be measurable. Verbs like "develop",
            "measure", "evaluate", and "deploy" work better than "study" or "understand".
          </p>
        </>
      )}

      {step === "scope" && (
        <>
          <StepHeading
            title="Step 4 — Scope and Limitations"
            description="Set clear boundaries so your manuscript stays realistic."
          />
          <DynamicFieldList
            label="Included"
            items={profile.scopeIncluded}
            onChange={(v) => patch("scopeIncluded", v)}
          />
          <DynamicFieldList
            label="Excluded"
            items={profile.scopeExcluded}
            onChange={(v) => patch("scopeExcluded", v)}
          />
          <Input
            label="Target users / beneficiaries"
            value={profile.primaryUsers}
            onChange={(e) => patch("primaryUsers", e.target.value)}
          />
        </>
      )}

      {step === "methodology" && (
        <>
          <StepHeading
            title="Step 5 — Methodology"
            description="How will you build and evaluate the system?"
          />
          <Select
            aria-label="Development methodology"
            value={profile.methodology ?? ""}
            onChange={(e) =>
              patch("methodology", (e.target.value || null) as ProjectProfile["methodology"])
            }
          >
            <option value="">Select a methodology...</option>
            <option value="agile">Agile</option>
            <option value="waterfall">Waterfall</option>
            <option value="prototype">Prototyping</option>
            <option value="rad">RAD</option>
            <option value="other">Other (describe in notes below)</option>
          </Select>
          {profile.methodology === "other" && (
            <Textarea
              label="Describe your intended approach"
              value={profile.proposedSystem}
              onChange={(e) => patch("proposedSystem", e.target.value)}
              rows={3}
            />
          )}
          <p className="text-[11px] leading-relaxed text-surface-500 dark:text-surface-400">
            Need guidance? Ask the AI Adviser (Methodology Adviser mode) from the
            sidebar before committing.
          </p>
        </>
      )}

      {step === "summary" && (
        <div className="space-y-4">
          <StepHeading
            title="AI Review & Summary"
            description="The adviser reads your full profile and highlights the biggest gap."
          />
          {!summary ? (
            <div className="rounded-xl border border-dashed border-surface-300 p-6 text-center dark:border-surface-700">
              <p className="mb-3 text-xs text-surface-500 dark:text-surface-400">
                Let the adviser analyze your answers so far.
              </p>
              <Button onClick={onRunSummary} loading={summarizing}>
                <BotMessageSquare className="h-4 w-4" /> Analyze my profile
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm leading-relaxed dark:border-surface-800 dark:bg-surface-950">
              <p className="whitespace-pre-wrap">{summary}</p>
            </div>
          )}
          <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-800">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">
              Quick profile check
            </h3>
            <ProfileChecklist profile={profile} />
          </div>
        </div>
      )}

      {/* AI Suggestions Panel */}
      {showAiPanel && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-2">
              <BotMessageSquare className="h-4 w-4" />
              AI Suggestions
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAiPanel(false)}>
              ✕
            </Button>
          </div>

          {/* Action buttons */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={runAnalyze}
              loading={aiLoading === "analyze"}
              disabled={aiLoading !== null}
            >
              <Lightbulb className="h-3.5 w-3.5" /> Analyze
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={runAutofill}
              loading={aiLoading === "autofill"}
              disabled={aiLoading !== null}
            >
              Auto-fill missing
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={runQuestions}
              loading={aiLoading === "questions"}
              disabled={aiLoading !== null}
            >
              Get Questions
            </Button>
          </div>

          {/* Analysis results */}
          {aiAnalysis && (
            <div className="space-y-3">
              {aiAnalysis.strengths.length > 0 && (
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                  <h4 className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Strengths
                  </h4>
                  <ul className="text-[11px] text-emerald-600 dark:text-emerald-400 space-y-0.5">
                    {aiAnalysis.strengths.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiAnalysis.gaps.length > 0 && (
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <h4 className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Gaps to address
                  </h4>
                  <ul className="text-[11px] text-amber-600 dark:text-amber-400 space-y-0.5">
                    {aiAnalysis.gaps.map((g, i) => (
                      <li key={i}>• {g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Object.keys(aiAnalysis.fieldSuggestions).length > 0 && (
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <h4 className="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                    Field suggestions
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(aiAnalysis.fieldSuggestions).map(([field, { suggestedValue, reasoning }]) => (
                      <div key={field} className="flex items-start gap-2 p-2 rounded bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{field}</p>
                          <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-0.5">{suggestedValue}</p>
                          <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-0.5 italic">{reasoning}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="secondary" onClick={() => {
                            patch(field as keyof ProjectProfile, suggestedValue as any);
                            dismissAiSuggestion(field);
                          }}>
                            Apply
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => dismissAiSuggestion(field)}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Questions */}
          {aiQuestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                Clarifying questions
              </h4>
              {aiQuestions.map((q) => (
                <div key={q.field} className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <p className="mb-2 text-xs font-medium text-purple-700 dark:text-purple-300">{q.question}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.choices.map((choice, ci) => (
                      <Button
                        key={ci}
                        size="sm"
                        variant="secondary"
                        onClick={() => applyAiQuestion(q, choice.value)}
                      >
                        {choice.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => dismissAiQuestion(q.field)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(!aiAnalysis || Object.keys(aiAnalysis?.fieldSuggestions || {}).length === 0) && aiQuestions.length === 0 && !aiLoading && (
            <p className="text-center text-xs text-surface-500 dark:text-surface-400 py-4">
              Click "Analyze" to get AI suggestions for this step
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between border-t border-surface-100 pt-4 dark:border-surface-800">
        <div>
          {!isFirst && (
            <Button variant="secondary" onClick={onPrev}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={saving ? "warning" : "neutral"} className="tabular-nums">
            {saving ? "Saving…" : "Auto-saved"}
          </Badge>
          {!isLast ? (
            <Button onClick={onNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onDone}>
                Go to overview
              </Button>
              <Button onClick={onViewDraft}>
                <FileText className="h-4 w-4" /> View my draft thesis
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{description}</p>
    </div>
  );
}

function ProfileChecklist({ profile }: { profile: ProjectProfile }) {
  const items: { label: string; ok: boolean }[] = [
    { label: "Problem statement", ok: !!profile.problemStatement },
    { label: "Proposed system", ok: !!profile.proposedSystem },
    {
      label: "Primary users",
      ok: !!profile.primaryUsers,
    },
    { label: "Major features", ok: profile.majorFeatures.length > 0 },
    { label: "General objective", ok: !!profile.generalObjective },
    { label: "Specific objectives", ok: profile.specificObjectives.length > 0 },
    { label: "Scope (included)", ok: profile.scopeIncluded.length > 0 },
    { label: "Methodology", ok: !!profile.methodology },
  ];
  return (
    <ul className="space-y-1.5 text-xs">
      {items.map(({ label, ok }) => (
        <li key={label} className="flex items-center gap-2">
          {ok ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
          ) : (
            <span className="inline-block h-3.5 w-3.5 rounded-full border border-surface-300 dark:border-surface-700" aria-hidden />
          )}
          <span className={ok ? "" : "text-surface-400"}>{label}</span>
        </li>
      ))}
    </ul>
  );
}