export type ProjectStatus = "planning" | "in_progress" | "review" | "completed";

export type DevelopmentMethodology =
  | "agile"
  | "waterfall"
  | "prototype"
  | "rad"
  | "other";

/**
 * Core capstone project record. Owned by exactly one user.
 * Mirrors the future Supabase `projects` table shape.
 */
export interface Project {
  id: string;
  userId: string;
  title: string;
  courseProgram: string;
  institution: string;
  projectType: string;
  academicYear: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Structured knowledge base captured during the onboarding wizard.
 * Answers become the context used by every AI feature downstream.
 */
export interface ProjectProfile {
  projectId: string;
  // Step 2 — Problem
  problemStatement: string;
  whoExperiences: string;
  whereOccurs: string;
  currentProcess: string;
  currentWeaknesses: string;
  // Step 3 — Proposed Solution
  proposedSystem: string;
  primaryUsers: string;
  majorFeatures: string[];
  technologies: string[];
  // Step 4 — Objectives
  generalObjective: string;
  specificObjectives: string[];
  // Step 5 — Scope
  scopeIncluded: string[];
  scopeExcluded: string[];
  // Step 6 — Methodology
  methodology: DevelopmentMethodology | null;
  updatedAt: string;
}

/** Helper returning an empty profile scaffold for new projects. */
export function emptyProjectProfile(projectId: string): ProjectProfile {
  return {
    projectId,
    problemStatement: "",
    whoExperiences: "",
    whereOccurs: "",
    currentProcess: "",
    currentWeaknesses: "",
    proposedSystem: "",
    primaryUsers: "",
    majorFeatures: [],
    technologies: [],
    generalObjective: "",
    specificObjectives: [],
    scopeIncluded: [],
    scopeExcluded: [],
    methodology: null,
    updatedAt: new Date().toISOString(),
  };
}
