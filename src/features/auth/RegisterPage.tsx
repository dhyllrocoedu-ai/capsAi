import { useNavigate } from "@tanstack/react-router";
import { AuthLayout, AuthForm } from "./AuthLayout";
import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/Button";

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const guestLogin = useAuthStore((s) => s.guestLogin);

  return (
    <AuthLayout>
      <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900">
        <h2 className="mb-1 text-sm font-semibold">Create your workspace</h2>
        <p className="mb-5 text-xs text-surface-500 dark:text-surface-400">
          Local testing build — data is stored in your browser only.
        </p>
        <AuthForm
          mode="register"
          onSubmit={async ({ fullName, email, password }) => {
            await register(fullName, email, password);
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
