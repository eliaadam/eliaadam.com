import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login, loginError, loginFieldErrors, isLoggingIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const location = useLocation();
  const justRegistered = (location.state as { registered?: boolean })
    ?.registered;
  const registeredEmail = (location.state as { identifier?: string })
    ?.identifier;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login({ identifier, password }).catch(() => {});
  };

  const fieldError = (field: string): string | null =>
    loginFieldErrors?.[field]?.[0] ?? null;

  const inputBase =
    "w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-black text-black dark:text-white outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-black dark:focus:border-white";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black dark:text-white m-0">
            HALA
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {loginError && !loginFieldErrors && (
            <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white font-medium">
              ! {loginError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="identifier"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Email
            </label>
            <input
              id="identifier"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Your Email"
              autoComplete="email"
              autoFocus
              required
              disabled={isLoggingIn}
              className={`${inputBase} ${fieldError("identifier") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
            />
            {justRegistered && (
              <div className="px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-white">
                ✓ Account created successfully! Sign in with{" "}
                <strong>{registeredEmail}</strong>
              </div>
            )}
            {fieldError("identifier") && (
              <p className="text-[13px] text-black dark:text-white font-medium m-0">
                {fieldError("identifier")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isLoggingIn}
              className={`${inputBase} ${fieldError("password") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
            />
            {fieldError("password") && (
              <p className="text-[13px] text-black dark:text-white font-medium m-0">
                {fieldError("password")}
              </p>
            )}
          </div>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center m-0">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-black dark:text-white font-medium underline underline-offset-2"
            >
              Create one
            </Link>
          </p>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
          >
            {isLoggingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
