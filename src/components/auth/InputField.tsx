import { useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";

interface InputFieldProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  icon?: LucideIcon;
  label?: string;
  error?: string;

  /** Stable id for a11y; defaults to a derived value */
  id?: string;
  /** Explicit name for accessibility & autofill; defaults to derived value */
  name?: string;
  /** autoComplete attribute override */
  autoComplete?: string;
}

const InputField = ({
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  label,
  error,
  id,
  name,
  autoComplete,
}: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  // Ensure every input has stable id + name.
  const stableId =
    id ??
    (label
      ? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      : `field-${type}`);

  const stableName =
    name ??
    (type === "email"
      ? "email"
      : type === "password"
        ? "password"
        : label
          ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          : type);

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={stableId}
          className="text-sm font-medium text-foreground/80 block pl-1"
        >
          {label}
        </label>
      )}

      <div className="relative group">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors"
          />
        )}

        <input
          id={stableId}
          name={stableName}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${stableId}-error` : undefined}
          className={`
            w-full h-12 rounded-xl bg-accent/50 border-0
            ${Icon ? "pl-11" : "pl-4"} ${isPassword ? "pr-11" : "pr-4"}
            text-sm text-foreground placeholder:text-muted-foreground/60
            outline-none
            focus:ring-2 focus:ring-primary/30 focus:bg-accent/80
            transition-all duration-200
            ${error ? "ring-2 ring-destructive/40" : ""}
          `}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p id={`${stableId}-error`} className="text-xs text-destructive pl-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default InputField;

