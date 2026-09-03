import { useNavigate } from "@tanstack/react-router";
import { AuthLayout, AuthForm } from "./AuthLayout";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/Button";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const guestLogin = useAuthStore((s) => s.guestLogin);

  return (
    <AuthLayout>
      <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900">
        <h2 className="mb-1 text-sm font-semibold">Welcome back</h2>
        <p className="mb-5 text-xs text-surface-500 dark:text-surface-400">
          Sign in to continue your capstone work.
        </p>
        <AuthForm
          mode="login"
          onSubmit={async ({ email, password }) => {
            await login(email, password);
            void navigate({ to: "/app/dashboard" });
          }}
        />
        <Button
          variant="secondary"
          className="w-full mt-3"
          onClick={() => {
            guestLogin();
            void navigate({ to: "/app/dashboard" });
          }}
        >
          Continue as Guest
        </Button>
      </div>
    </AuthLayout>
  );
}
