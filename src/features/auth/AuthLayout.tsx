import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="text-xl font-bold tracking-tight">Capstone AI</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Your AI-powered Capstone Adviser and Documentation Workspace
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (fields: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
}

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ fullName: fullName.trim(), email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "register" && (
<Input
        id="fullName"
        label="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      )}
      <Input
        id="email"
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="password"
        type="password"
        label="Password"
        placeholder={mode === "register" ? "At least 6 characters" : ""}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/60 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        {mode === "login" ? "Sign in" : "Create account"}
      </Button>

      <p className="text-center text-xs text-surface-500 dark:text-surface-400">
        {mode === "login" ? (
          <>
            No account yet?{" "}
            <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Register
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
