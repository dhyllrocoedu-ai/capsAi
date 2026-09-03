import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <h1 className="text-xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader
          title="Storage & backend status"
          subtitle="Phase 1 runs fully local; services activate in later phases."
        />
        <CardContent className="space-y-3 text-sm">
          <StatusRow label="Data storage" value="Browser localStorage" tone="warning" />
          <StatusRow label="Authentication" value="Local test accounts" tone="warning" />
          <StatusRow
            label="AI provider"
            value={
              import.meta.env.VITE_NVIDIA_API_KEY
                ? "NVIDIA NIM (direct dev call)"
                : "Mock provider (no key)"
            }
            tone={import.meta.env.VITE_NVIDIA_API_KEY ? "success" : "neutral"}
          />
          <StatusRow label="Supabase" value="Not connected (planned Phase 2)" tone="neutral" />
          <StatusRow label="Research APIs" value="Planned Phase 5" tone="neutral" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="About"
          subtitle="Capstone AI MVP"
        />
        <CardContent className="space-y-2 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
<p>
              Capstone AI is an AI-powered capstone adviser and documentation
              workspace for students. It assists and guides — it
              never silently writes academic work for you.
            </p>
          <p>
            Local testing build: all data lives in this browser. Clearing site
            data removes your test account, projects, and drafts.
          </p>
          <Badge tone="brand">v0.1.0 — Phase 1 Foundation</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-surface-100 pb-3 last:border-b-0 last:pb-0 dark:border-surface-800">
      <span className="text-xs text-surface-500 dark:text-surface-400">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
