import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, LogIn, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { classifyError, isBackendUnavailable } from "@/lib/errorClassifier";
import { authService } from "@/services/authService";

import InputField from "./InputField";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm = ({ onSwitchToRegister }: LoginFormProps) => {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const validate = () => {
    const nextErrors: typeof errors = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(email.trim(), password);
      await refresh();

      if (!result.role) {
        toast.error("Your account does not have an assigned role yet.");
        return;
      }

      navigate(`/dashboard/${result.role}`);
    } catch (error: unknown) {
      console.error("[LoginForm] handleLogin error:", error);

      const classified = classifyError(error);

      switch (classified.type) {
        case "network": {
          toast.error(
            isBackendUnavailable(error)
              ? "Cannot reach the authentication service. Please try again in a moment."
              : classified.message,
          );
          break;
        }

        case "validation": {
          toast.error(classified.message);
          break;
        }

        case "auth": {
          toast.error("Invalid email or password");
          break;
        }

        case "forbidden": {
          toast.error(classified.message);
          break;
        }

        case "not_found": {
          toast.error("User not found");
          break;
        }

        case "server": {
          toast.error("Server error. Please try again later.");
          break;
        }

        default: {
          const message =
            error instanceof Error ? error.message : "Login failed. Please try again.";
          toast.error(message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-bold text-foreground md:text-4xl">
        Welcome Back
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Login to your account
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <InputField
          id="login-email"
          name="email"
          autoComplete="email"
          type="email"
          label="Email"
          placeholder="your@email.com"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          icon={Mail}
          error={errors.email}
        />

        <InputField
          id="login-password"
          name="password"
          autoComplete="current-password"
          type="password"
          label="Password"
          placeholder="........"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          icon={Lock}
          error={errors.password}
        />

        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">
            or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          onClick={() => toast.info("Google sign-in coming soon")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>

        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          onClick={() => toast.info("Facebook sign-in coming soon")}
        >
          <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <button
          onClick={onSwitchToRegister}
          className="font-semibold text-primary hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
};

export default LoginForm;
