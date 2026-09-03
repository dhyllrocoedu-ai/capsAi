import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AppShell } from "@/app/AppShell";
import { isAuthenticated } from "@/lib/stores/authStore";
import { LandingPage } from "@/features/auth/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ProjectOverviewPage } from "@/features/projects/ProjectOverviewPage";
import { DocumentationPage } from "@/features/documentation/DocumentationPage";
import { AIAdviserPage } from "@/features/ai/AIAdviserPage";
import { ProjectWizardPage } from "@/features/projects/ProjectWizardPage";
import { ProjectCodePage } from "@/features/projects/ProjectCodePage";
import { SettingsPage } from "@/features/shared/SettingsPage";

const rootRoute = createRootRoute();

// --- Public routes ---------------------------------------------------------

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const authGuard = () => {
  if (!isAuthenticated()) throw redirect({ to: "/login" });
};

const guestOnly = () => {
  if (isAuthenticated()) throw redirect({ to: "/app/dashboard" });
};

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: guestOnly,
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  beforeLoad: guestOnly,
  component: RegisterPage,
});

// --- Protected app layout ---------------------------------------------------

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "app",
  beforeLoad: authGuard,
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "dashboard",
  component: DashboardPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "projects",
  component: ProjectsPage,
});

const projectOverviewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "projects/$projectId",
  component: ProjectOverviewPage,
});

const projectDocsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "projects/$projectId/documentation",
  component: DocumentationPage,
});

const projectAdviserRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "projects/$projectId/adviser",
  component: AIAdviserPage,
});

const documentationRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "documentation",
  component: DocumentationPage,
});

const adviserRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "adviser",
  component: AIAdviserPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "settings",
  component: SettingsPage,
});

const projectWizardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "projects/$projectId/wizard",
  component: ProjectWizardPage,
});

const projectCodeRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "projects/$projectId/code",
  component: ProjectCodePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    projectsRoute,
    projectOverviewRoute,
    projectDocsRoute,
    projectAdviserRoute,
    projectWizardRoute,
    projectCodeRoute,
    documentationRoute,
    adviserRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultNotFoundComponent: () => (
    <div className="flex h-full items-center justify-center text-sm text-surface-500">
      Page not found.
    </div>
  ),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
