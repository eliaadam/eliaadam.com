import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { system } from "../lib/system";
import type { MaicoreValidationError } from "../lib/system-sdk";

export default function SignupPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (password !== passwordConfirm) {
        throw new Error("Passwords do not match.");
      }
      await system.identity.auth.register({
        identifier,
        password,
        display_name: displayName,
      });
    },
    onSuccess: () => {
      navigate("/login", {
        replace: true,
        state: { registered: true, identifier },
      });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  let errorMessage: string | null = null;
  let fieldErrors: Record<string, string[]> | null = null;

  if (mutation.error) {
    const err = mutation.error;
    if (
      typeof err === "object" &&
      err !== null &&
      "errors" in err &&
      typeof (err as MaicoreValidationError).errors === "object"
    ) {
      fieldErrors = (err as MaicoreValidationError).errors;
      errorMessage = (err as MaicoreValidationError).message;
    } else {
      errorMessage =
        err instanceof Error ? err.message : "Registration failed.";
    }
  }

  const fieldError = (field: string): string | null =>
    fieldErrors?.[field]?.[0] ?? null;

  const inputBase =
    "w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-black text-black dark:text-white outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-black dark:focus:border-white";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black dark:text-white m-0">
            Platform
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {errorMessage && !fieldErrors && (
            <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white font-medium">
              ! {errorMessage}
            </div>
          )}

          {mutation.isSuccess && (
            <div className="px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-white">
              ✓ Account created! Redirecting to login…
            </div>
          )}

          <Field label="Full Name" error={fieldError("display_name")}>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              autoFocus
              required
              disabled={mutation.isPending}
              className={`${inputBase} ${fieldError("display_name") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
            />
          </Field>

          <Field label="Email" error={fieldError("identifier")}>
            <input
              id="identifier"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="jane@example.com"
              autoComplete="email"
              required
              disabled={mutation.isPending}
              className={`${inputBase} ${fieldError("identifier") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
            />
          </Field>

          <Field label="Password" error={fieldError("password")}>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={mutation.isPending}
              className={`${inputBase} ${fieldError("password") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
            />
          </Field>

          <Field label="Confirm Password">
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={8}
              disabled={mutation.isPending}
              className={`${inputBase} border-neutral-300 dark:border-neutral-700`}
            />
          </Field>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-1 px-4 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
          >
            {mutation.isPending ? "Creating account…" : "Create account"}
          </button>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center m-0">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-black dark:text-white font-medium underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[13px] text-black dark:text-white font-medium m-0">
          {error}
        </p>
      )}
    </div>
  );
}
