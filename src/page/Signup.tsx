import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../components/context/Authcontext";
 

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => signUp(name, email, password),
    onSuccess: () => navigate("/dashboard", { replace: true }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between px-6 py-6">
        <Link to="/" className="text-sm font-semibold tracking-tight">
          sysc
        </Link>
 
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Takes about a minute.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/40 focus:border-teal-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-teal-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/40 focus:border-teal-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-teal-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/40 focus:border-teal-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-teal-400"
              />
              <p className="text-xs text-slate-500 dark:text-slate-500">At least 8 characters.</p>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Something went wrong creating your account. Try again.
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              {mutation.isPending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link to="/signin" className="font-medium text-teal-700 dark:text-teal-400">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}