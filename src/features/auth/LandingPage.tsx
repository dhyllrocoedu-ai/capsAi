import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BotMessageSquare,
  FileText,
  GraduationCap,
  Search,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Chapter-by-Chapter Workspace",
    description:
      "Build your capstone documentation section by section with autosave, version history, and word counts.",
  },
  {
    icon: BotMessageSquare,
    title: "AI Capstone Adviser",
    description:
      "A project-aware adviser that asks clarifying questions, spots gaps, and guides — never replaces — your work.",
  },
  {
    icon: Search,
    title: "Legitimate Research Sources",
    description:
      "Search OpenAlex and Crossref for real academic papers. The AI never invents citations.",
  },
  {
    icon: ShieldCheck,
    title: "Alignment Review",
    description:
      "Check that objectives, features, scope, methodology, and conclusions stay logically consistent.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-50 dark:bg-surface-950">
      {/* Nav */}
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">Capstone AI</span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 font-medium text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition-colors hover:bg-brand-500"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
<main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16">
            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Your AI-powered capstone adviser and{" "}
              <span className="text-brand-600 dark:text-brand-400">
                documentation workspace
              </span>
            </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-surface-600 dark:text-surface-400">
          Plan your system, write your manuscript chapter by chapter, find real
          research sources, and check your alignment before the panel does.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            Start your workspace
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-surface-300 px-6 py-3 text-sm font-semibold text-surface-700 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
          >
            I have an account
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-surface-200 py-6 text-center text-xs text-surface-400 dark:border-surface-800">
        Capstone AI — assists and guides; it never writes your paper for you.
      </footer>
    </div>
  );
}
