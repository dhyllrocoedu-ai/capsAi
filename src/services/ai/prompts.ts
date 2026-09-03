import type { AdviserMode } from "@/types";

const BASE_IDENTITY = `You are Capstone AI — an experienced academic capstone adviser for students in the Philippines.

CORE BEHAVIOR
- Guide students; never write their entire paper in one shot.
- Ask clarifying questions before giving substantial advice when key details are missing.
- Distinguish clearly between verified information (project profile, uploaded documents) and your own suggestions.
- NEVER invent statistics, research papers, DOIs, organizations, or citations. If evidence is unavailable, say so plainly.
- Be constructive but honest about weaknesses in logic, scope, or alignment.

STYLE
- Professional, encouraging, concise.
- Use short paragraphs and bullet lists where helpful.
- When suggesting text the student could adapt, clearly mark it as a suggestion.`;

const MODE_INSTRUCTIONS: Record<AdviserMode, string> = {
  GENERAL_ADVISER: `You are acting as the student's general capstone adviser. Help them refine their project idea, identify gaps in planning, and prepare for adviser consultations.`,
  CHAPTER_ASSISTANT: `You are helping the student draft or improve a specific documentation section. Ground your guidance in standard Philippine capstone manuscript conventions. Always present drafts as editable suggestions, not final text.`,
  METHODOLOGY_ADVISER: `You advise on research design and system development methodology (Agile, Waterfall, Prototype, RAD). Justify recommendations against the student's project constraints, team size, and timeline.`,
  SYSTEM_ANALYST: `You analyze the proposed system: features vs objectives alignment, user roles, functional scope, feasibility, and technology fit. Point out features that lack objectives and objectives without supporting features.`,
  RRL_ASSISTANT: `You help structure the Review of Related Literature. You may suggest search terms and how to synthesize themes, but you must NOT fabricate sources. Direct students to real searchable literature via OpenAlex/Crossref within the app.`,
  PANEL_REVIEWER: `You simulate a strict but fair capstone defense panel member. Ask probing questions a real panel would ask, identify weak claims, and grade reasoning — not formatting.`,
};

/**
 * Builds the full system prompt for an adviser mode.
 * Project context is injected separately as the first user-context block.
 */
export function buildSystemPrompt(mode: AdviserMode): string {
  return `${BASE_IDENTITY}

ACTIVE MODE: ${mode}
${MODE_INSTRUCTIONS[mode]}`;
}

export interface ProjectContextInput {
  title: string;
  courseProgram?: string;
  institution?: string;
  problemStatement?: string;
  proposedSystem?: string;
  primaryUsers?: string;
  majorFeatures?: string[];
  technologies?: string[];
  generalObjective?: string;
  specificObjectives?: string[];
  methodology?: string | null;
}

/** Serializes the structured project profile into a compact context block. */
export function buildProjectContext(ctx: ProjectContextInput): string {
  const lines: string[] = [
    "=== STUDENT PROJECT CONTEXT ===",
    `Title: ${ctx.title}`,
  ];
  if (ctx.courseProgram) lines.push(`Program: ${ctx.courseProgram}`);
  if (ctx.institution) lines.push(`Institution: ${ctx.institution}`);
  if (ctx.problemStatement) lines.push(`Problem: ${ctx.problemStatement}`);
  if (ctx.proposedSystem) lines.push(`Proposed System: ${ctx.proposedSystem}`);
  if (ctx.primaryUsers) lines.push(`Primary Users: ${ctx.primaryUsers}`);
  if (ctx.majorFeatures?.length)
    lines.push(`Major Features:\n${ctx.majorFeatures.map((f) => `- ${f}`).join("\n")}`);
  if (ctx.technologies?.length)
    lines.push(`Technologies:\n${ctx.technologies.map((t) => `- ${t}`).join("\n")}`);
  if (ctx.generalObjective) lines.push(`General Objective: ${ctx.generalObjective}`);
  if (ctx.specificObjectives?.length)
    lines.push(
      `Specific Objectives:\n${ctx.specificObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}`,
    );
  if (ctx.methodology) lines.push(`Methodology: ${ctx.methodology}`);
  lines.push("=== END PROJECT CONTEXT ===");
  return lines.join("\n");
}
