import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/states";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { formatDate } from "@/lib/utils";

const PROJECT_TYPES = [
  "Web Application",
  "Mobile Application",
  "Desktop Application",
  "Web & Mobile",
  "Hardware / IoT Integration",
  "Data Analytics / ML",
  "Other",
];

function CreateProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const createProject = useProjectStore((s) => s.createProject);

  const [form, setForm] = useState({
    title: "",
    courseProgram: "",
    institution: "",
    projectType: PROJECT_TYPES[0],
    academicYear: `AY ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!user) return;
    if (!form.title.trim()) {
      setError("Project title is required.");
      return;
    }
    const project = createProject(user, {
      ...form,
      title: form.title.trim(),
      courseProgram: form.courseProgram.trim(),
      institution: form.institution.trim(),
    });
    onClose();
    void navigate({
      to: "/app/projects/$projectId/wizard",
      params: { projectId: project.id },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New capstone project"
      subtitle="Step 1 — basic information. You'll define the problem, objectives, and scope next."
      wide
    >
      <div className="space-y-4">
        <Input
          id="title"
          label="Project title"
          placeholder="Your capstone project title"
          value={form.title}
          onChange={set("title")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="course"
            label="Course / Program"
            value={form.courseProgram}
            onChange={set("courseProgram")}
          />
          <Input
            id="institution"
            label="Institution"
            value={form.institution}
            onChange={set("institution")}
          />
          <Select
            aria-label="Project type"
            value={form.projectType}
            onChange={set("projectType") as never}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Input
            id="ay"
            label="Academic year"
            value={form.academicYear}
            onChange={set("academicYear")}
          />
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create project</Button>
        </div>
      </div>
    </Modal>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate({ from: "/app/projects" });
  const user = useAuthStore((s) => s.user);
  const projects = useProjectStore((s) => s.projects);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user) loadProjects(user.id);
  }, [user, loadProjects]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Projects</h1>
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
            Your capstone workspaces.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="h-6 w-6" />}
            title="No projects yet"
            description="Create your first capstone project to get started."
            action={
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" /> New project
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProject(p.id);
                void navigate({ to: `/app/projects/${p.id}` });
              }}
              className="group text-left"
            >
              <Card className="h-full transition-colors group-hover:border-brand-300 dark:group-hover:border-brand-800">
                <CardContent className="flex h-full flex-col">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug text-surface-900 group-hover:text-brand-700 dark:text-surface-100 dark:group-hover:text-brand-300">
                      {p.title}
                    </h3>
                    <Badge
                      tone={
                        p.status === "completed"
                          ? "success"
                          : p.status === "review"
                            ? "warning"
                            : "brand"
                      }
                    >
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <dl className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
                    <div className="truncate">{p.courseProgram || "—"}</div>
                    <div className="truncate">{p.institution || "—"}</div>
                  </dl>
                  <p className="mt-auto pt-3 text-[11px] text-surface-400">
                    Updated {formatDate(p.updatedAt)} · AY{" "}
                    {p.academicYear || "—"}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
