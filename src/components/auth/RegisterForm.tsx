import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { authService } from "@/services/authService";

import InputField from "./InputField";
import FileUploadField, { type UploadedFile } from "./FileUploadField";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [idFiles, setIdFiles] = useState<UploadedFile[]>([]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const age = useMemo(() => {
    if (!birthdate) {
      return "";
    }

    const today = new Date();
    const submittedBirthdate = new Date(birthdate);
    let calculatedAge =
      today.getFullYear() - submittedBirthdate.getFullYear();
    const monthDifference = today.getMonth() - submittedBirthdate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < submittedBirthdate.getDate())
    ) {
      calculatedAge -= 1;
    }

    return calculatedAge >= 0 ? String(calculatedAge) : "";
  }, [birthdate]);

  const clearError = (key: string) =>
    setErrors((current) => ({ ...current, [key]: undefined }));

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!fullName.trim()) nextErrors.fullName = "Full name is required";

    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Invalid email format";
    }

    if (!birthdate) nextErrors.birthdate = "Birthdate is required";
    if (!address.trim()) nextErrors.address = "Address is required";

    if (!contactNumber.trim()) {
      nextErrors.contactNumber = "Contact number is required";
    } else if (!/^[\d\s+()-]{7,15}$/.test(contactNumber)) {
      nextErrors.contactNumber = "Invalid phone format";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 6) {
      nextErrors.password = "Min 6 characters";
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (idFiles.length < 2) nextErrors.idFiles = "Please upload 2 valid IDs";

    if (!agreeTerms) {
      nextErrors.agreeTerms = "You must agree to the Terms & Privacy Policy";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading || !validate()) {
      return;
    }

    setLoading(true);

    try {
      const result = await authService.register({
        address: address.trim(),
        birthdate,
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        idFiles: idFiles.map((file) => file.file),
        password,
      });

      toast.success(result.message);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof Error) {
        const normalizedMessage = error.message.toLowerCase();

        if (normalizedMessage.includes("email already")) {
          toast.error("Email is already registered");
        } else if (normalizedMessage.includes("rate limit")) {
          toast.error(
            "Too many requests. Please wait a few seconds and try again.",
          );
        } else {
          toast.error(error.message || "Something went wrong. Please try again.");
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-primary" />
        <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
          Account Request Submitted
        </h2>
        <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
          Your account request is under review. Please wait for admin approval.
          You will receive an email once your account has been reviewed.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-bold text-foreground md:text-4xl">
        Welcome
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Let&apos;s help you get started
      </p>

      <form onSubmit={handleRegister} className="space-y-4">
        <InputField
          label="Full Name"
          placeholder="Juan Dela Cruz"
          value={fullName}
          onChange={(value) => {
            setFullName(value);
            clearError("fullName");
          }}
          icon={User}
          error={errors.fullName}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="register-birthdate"
              className="block pl-1 text-sm font-medium text-foreground/80"
            >
              Birthdate <span className="text-destructive">*</span>
            </label>
            <div className="group relative">
              <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                id="register-birthdate"
                name="birthdate"
                type="date"
                value={birthdate}
                onChange={(inputEvent) => {
                  setBirthdate(inputEvent.target.value);
                  clearError("birthdate");
                }}
                max={new Date().toISOString().split("T")[0]}
                className={`w-full rounded-xl bg-accent/50 pl-11 pr-4 text-sm text-foreground outline-none transition-all duration-200 focus:bg-accent/80 focus:ring-2 focus:ring-primary/30 ${
                  errors.birthdate ? "ring-2 ring-destructive/40" : ""
                } h-12 border-0`}
              />
            </div>
            {errors.birthdate ? (
              <p className="pl-1 text-xs text-destructive">{errors.birthdate}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="register-age"
              className="block pl-1 text-sm font-medium text-foreground/80"
            >
              Age
            </label>
            <input
              id="register-age"
              name="age"
              type="text"
              value={age}
              readOnly
              placeholder="-"
              className="h-12 w-full cursor-not-allowed rounded-xl border-0 bg-accent/30 px-4 text-sm text-foreground/70 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="register-address"
            className="block pl-1 text-sm font-medium text-foreground/80"
          >
            Address <span className="text-destructive">*</span>
          </label>
          <div className="group relative">
            <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <textarea
              id="register-address"
              name="address"
              placeholder="Your complete address"
              value={address}
              onChange={(inputEvent) => {
                setAddress(inputEvent.target.value);
                clearError("address");
              }}
              rows={2}
              className={`w-full resize-none rounded-xl bg-accent/50 py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/60 focus:bg-accent/80 focus:ring-2 focus:ring-primary/30 ${
                errors.address ? "ring-2 ring-destructive/40" : ""
              } border-0`}
            />
          </div>
          {errors.address ? (
            <p className="pl-1 text-xs text-destructive">{errors.address}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InputField
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChange={(value) => {
              setEmail(value);
              clearError("email");
            }}
            icon={Mail}
            error={errors.email}
          />

          <InputField
            label="Contact No."
            placeholder="+63 912 345 6789"
            value={contactNumber}
            onChange={(value) => {
              setContactNumber(value);
              clearError("contactNumber");
            }}
            icon={Phone}
            error={errors.contactNumber}
          />
        </div>

        <InputField
          type="password"
          label="Password"
          placeholder="........"
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearError("password");
          }}
          icon={Lock}
          error={errors.password}
        />

        <InputField
          type="password"
          label="Confirm Password"
          placeholder="........"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            clearError("confirmPassword");
          }}
          icon={Lock}
          error={errors.confirmPassword}
        />

        <FileUploadField
          files={idFiles}
          onChange={(files) => {
            setIdFiles(files);
            clearError("idFiles");
          }}
          error={errors.idFiles}
        />

        <div className="pt-1">
          <label className="flex cursor-pointer select-none items-start gap-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(inputEvent) => {
                setAgreeTerms(inputEvent.target.checked);
                clearError("agreeTerms");
              }}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary accent-primary focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              I agree to the{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
              >
                Terms & Privacy Policy
              </button>
            </span>
          </label>
          {errors.agreeTerms ? (
            <p className="mt-1 pl-1 text-xs text-destructive">
              {errors.agreeTerms}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {loading ? "Submitting..." : "Sign Up"}
        </button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">
            or sign up with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          onClick={() => toast.info("Google sign-up coming soon")}
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
          onClick={() => toast.info("Facebook sign-up coming soon")}
        >
          <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          onClick={onSwitchToLogin}
          className="font-semibold text-primary hover:underline"
        >
          Log in
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;
