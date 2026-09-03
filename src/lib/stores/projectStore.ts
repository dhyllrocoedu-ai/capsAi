import { create } from "zustand";
import * as repo from "@/lib/repositories/projectRepo";
import { getSessionUser } from "@/lib/repositories/authRepo";
import type { Project } from "@/types";

interface ProjectState {
  projects: Project[];
  loading: boolean;
  /** Currently opened project id (workspace context). */
  activeProjectId: string | null;
  loadProjects: (userId: string) => void;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => Project | null;
  createProject: (
    user: { id: string },
    input: Pick<
      Project,
      "title" | "courseProgram" | "institution" | "projectType" | "academicYear"
    >,
  ) => Project;
  updateProject: (id: string, patch: Partial<Omit<Project, "id" | "userId">>) => void;
  deleteProject: (id: string) => void;
}

function persistActive(id: string | null): void {
  window.localStorage.setItem("capsai.active_project", JSON.stringify(id));
}

function readPersistedActive(): string | null {
  try {
    return JSON.parse(
      window.localStorage.getItem("capsai.active_project") ?? "null",
    ) as string | null;
  } catch {
    return null;
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  activeProjectId: readPersistedActive(),

  loadProjects: (userId) => {
    const projects = repo.listProjects(userId);
    let activeProjectId = get().activeProjectId;
    if (activeProjectId && !projects.some((p) => p.id === activeProjectId)) {
      activeProjectId = projects[0]?.id ?? null;
      persistActive(activeProjectId);
    }
    set({ projects, loading: false, activeProjectId });
  },

  setActiveProject: (id) => {
    persistActive(id);
    set({ activeProjectId: id });
  },

  getActiveProject: () =>
    get().projects.find((p) => p.id === get().activeProjectId) ?? null,

  createProject: (user, input) => {
    const current = getSessionUser();
    const owner = current ? { id: current.id } : { id: user.id };
    const project = repo.createProject(owner as never, input);
    set((s) => ({ projects: [project, ...s.projects] }));
    get().setActiveProject(project.id);
    return project;
  },

  updateProject: (id, patch) => {
    const userId = getSessionUser()?.id ?? "";
    const updated = repo.updateProject(id, patch, userId);
    if (!updated) return;
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deleteProject: (id) => {
    const userId = getSessionUser()?.id ?? "";
    if (!repo.deleteProject(id, userId)) return;
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id);
      const activeProjectId =
        s.activeProjectId === id
          ? projects[0]?.id ?? null
          : s.activeProjectId;
      persistActive(activeProjectId);
      return { projects, activeProjectId };
    });
  },
}));
