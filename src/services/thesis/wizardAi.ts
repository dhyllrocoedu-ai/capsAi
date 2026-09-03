export type WizardAction = "analyze" | "autofill" | "questions";

export interface WizardFieldSuggestion {
  suggestedValue: string;
  reasoning: string;
}

export interface WizardAnalysis {
  strengths: string[];
  gaps: string[];
  fieldSuggestions: Record<string, WizardFieldSuggestion>;
}

export interface WizardAutofill {
  autofill: Record<string, { value: string; reasoning: string }>;
}

export interface WizardQuestion {
  field: string;
  question: string;
  choices: { label: string; value: string }[];
}

export interface WizardQuestionsResponse {
  questions: WizardQuestion[];
}

export interface WizardSuggestRequest {
  currentProfile: Record<string, unknown>;
  step?: string;
  action: WizardAction;
}

export interface WizardSuggestResponse {
  analysis?: WizardAnalysis;
  autofill?: Record<string, { value: string; reasoning: string }>;
  questions?: WizardQuestion[];
  error?: string;
}

const AI_PROXY_URL = "/api/ai";

export async function callWizardSuggest(
  request: WizardSuggestRequest
): Promise<WizardSuggestResponse> {
  try {
    const res = await fetch(`${AI_PROXY_URL}/wizard-suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Wizard suggest error (${res.status}): ${detail.slice(0, 200)}`);
    }

    return (await res.json()) as WizardSuggestResponse;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function analyzeWizardProfile(
  currentProfile: Record<string, unknown>,
  step?: string
): Promise<WizardAnalysis | { error: string }> {
  const res = await callWizardSuggest({ currentProfile, step, action: "analyze" });
  return res.analysis ? { ...res.analysis } : { error: res.error ?? "Analysis failed" };
}

export async function autofillWizardProfile(
  currentProfile: Record<string, unknown>,
  step?: string
): Promise<Record<string, { value: string; reasoning: string }> | { error: string }> {
  const res = await callWizardSuggest({ currentProfile, step, action: "autofill" });
  return res.autofill ? { ...res.autofill } : { error: res.error ?? "Autofill failed" };
}

export async function getWizardQuestions(
  currentProfile: Record<string, unknown>,
  step?: string
): Promise<WizardQuestion[] | { error: string }> {
  const res = await callWizardSuggest({ currentProfile, step, action: "questions" });
  return res.questions ? [...res.questions] : { error: res.error ?? "Questions failed" };
}