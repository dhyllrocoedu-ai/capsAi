import { readAll, uid, writeAll } from "./baseRepo";
import {
  DEFAULT_CHAPTER_STRUCTURE,
  emptyProjectProfile,
  type ActivityEntry,
  type Chapter,
  type Project,
  type ProjectProfile,
  type User,
} from "@/types";

const PROJECTS = "projects";
const PROFILES = "project_profiles";
const CHAPTERS = "chapters";
const ACTIVITIES = "activities";

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function listProjects(userId: string): Project[] {
  return readAll<Project>(PROJECTS)
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): Project | null {
  return readAll<Project>(PROJECTS).find((p) => p.id === id) ?? null;
}

export function createProject(
  user: User,
  input: Pick<
    Project,
    "title" | "courseProgram" | "institution" | "projectType" | "academicYear"
  >,
): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: uid(),
    userId: user.id,
    ...input,
    status: "planning",
    createdAt: now,
    updatedAt: now,
  };
  writeAll(PROJECTS, [project, ...readAll<Project>(PROJECTS)]);

  // Seed profile + default documentation structure
  saveProfile(emptyProjectProfile(project.id));
  seedChapters(project.id);

  logActivity({
    userId: user.id,
    projectId: project.id,
    type: "project_created",
    description: `Created project “${project.title}”`,
  });

  return project;
}

export function updateProject(
  id: string,
  patch: Partial<Omit<Project, "id" | "userId">>,
  userId: string,
): Project | null {
  const projects = readAll<Project>(PROJECTS);
  const idx = projects.findIndex((p) => p.id === id && p.userId === userId);
  if (idx === -1) return null;
  projects[idx] = { ...projects[idx], ...patch, updatedAt: new Date().toISOString() };
  writeAll(PROJECTS, projects);
  return projects[idx];
}

export function deleteProject(id: string, userId: string): boolean {
  const projects = readAll<Project>(PROJECTS);
  const next = projects.filter((p) => !(p.id === id && p.userId === userId));
  if (next.length === projects.length) return false;
  writeAll(PROJECTS, next);
  // Cascade-delete owned resources
  writeAll(PROFILES, readAll<ProjectProfile>(PROFILES).filter((x) => x.projectId !== id));
  writeAll(CHAPTERS, readAll<Chapter>(CHAPTERS).filter((c) => c.projectId !== id));
  writeAll(ACTIVITIES, readAll<ActivityEntry>(ACTIVITIES).filter((a) => a.projectId !== id));
  return true;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function getProfile(projectId: string): ProjectProfile | null {
  return (
    readAll<ProjectProfile>(PROFILES).find((p) => p.projectId === projectId) ??
    null
  );
}

export function saveProfile(profile: ProjectProfile): ProjectProfile {
  const all = readAll<ProjectProfile>(PROFILES);
  const idx = all.findIndex((p) => p.projectId === profile.projectId);
  const updated = { ...profile, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.push(updated);
  writeAll(PROFILES, all);
  return updated;
}

// ---------------------------------------------------------------------------
// Chapters — seeded from the canonical structure at project creation
// ---------------------------------------------------------------------------

function seedChapters(projectId: string): void {
  const existing = readAll<Chapter>(CHAPTERS).filter((c) => c.projectId === projectId);
  if (existing.length > 0) return;

  const chapters: Chapter[] = DEFAULT_CHAPTER_STRUCTURE.map((def, i) => ({
    id: `${projectId}-ch${def.number}`,
    projectId,
    number: def.number,
    title: `Chapter ${def.number} — ${def.title}`,
    orderIndex: i,
    status: "not_started",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const sections = DEFAULT_CHAPTER_STRUCTURE.flatMap((def) =>
    def.sections.map((title, j) => ({
      id: `${projectId}-ch${def.number}-s${j + 1}`,
      chapterId: `${projectId}-ch${def.number}`,
      title,
      content: "",
      orderIndex: j,
      status: "not_started" as const,
      wordCount: 0,
      updatedAt: new Date().toISOString(),
    })),
  );

  writeAll(CHAPTERS, [...readAll<Chapter>(CHAPTERS), ...chapters]);
  writeAll("chapter_sections", [
    ...readAll<ChapterSectionRow>("chapter_sections"),
    ...sections,
  ]);
}

type ChapterSectionRow = import("@/types").ChapterSection;

export function listChapters(projectId: string): Chapter[] {
  return readAll<Chapter>(CHAPTERS)
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function listSections(chapterIds: string[]): ChapterSectionRow[] {
  return readAll<ChapterSectionRow>("chapter_sections")
    .filter((s) => chapterIds.includes(s.chapterId))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function updateSectionContent(
  sectionId: string,
  content: string,
  wordCount: number,
): ChapterSectionRow | null {
  const all = readAll<ChapterSectionRow>("chapter_sections");
  const idx = all.findIndex((s) => s.id === sectionId);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    content,
    wordCount,
    status: wordCount > 20 ? "in_progress" : all[idx].status,
    updatedAt: new Date().toISOString(),
  };
  writeAll("chapter_sections", all);
  return all[idx];
}

export function setSectionStatus(
  sectionId: string,
  status: ChapterSectionRow["status"],
): ChapterSectionRow | null {
  const all = readAll<ChapterSectionRow>("chapter_sections");
  const idx = all.findIndex((s) => s.id === sectionId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], status, updatedAt: new Date().toISOString() };
  writeAll("chapter_sections", all);
  return all[idx];
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export function logActivity(
  input: Omit<ActivityEntry, "id" | "createdAt">,
): void {
  const entry: ActivityEntry = {
    id: uid(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  writeAll(ACTIVITIES, [entry, ...readAll<ActivityEntry>(ACTIVITIES)].slice(0, 100));
}

export function listActivities(userId: string, limit = 10): ActivityEntry[] {
  return readAll<ActivityEntry>(ACTIVITIES)
    .filter((a) => a.userId === userId)
    .slice(0, limit);
}
