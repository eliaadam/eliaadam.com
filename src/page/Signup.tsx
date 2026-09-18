// Signup.tsx
import { useState, type FormEvent, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Zap,
} from "lucide-react";
import { useAuth } from "../components/context/Authcontext";

function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function AuthHeader({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  return (
    <header className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <Link to="/" className="flex items-center gap-2.5">
        <img
          src="/images/mainlog.png"
          alt="Sonic Pesa"
          className="h-9 w-auto object-contain"
        />
      </Link>

      <button
        type="button"
        onClick={onToggleTheme}
        aria-label="Toggle dark mode"
        className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}

function MarketingPanel() {
  return (
    <section className="relative hidden min-h-[calc(100vh-80px)] overflow-hidden lg:flex lg:flex-1 lg:items-center">
      <div className="absolute inset-0">
        <div className="absolute -left-24 top-1/4 size-72 rounded-full bg-brand-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 size-80 rounded-full bg-brand-green-500/10 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-8 py-16 xl:px-16">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand-green-500/20 bg-brand-green-500/5 px-3 py-1.5 text-xs font-medium text-brand-green-600 dark:text-brand-green-400">
          <Sparkles size={13} />
          Start your Sonic Pesa journey
        </div>

        <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
          One account.{" "}
          <span className="bg-brand-gradient bg-clip-text text-transparent">
            More possibilities.
          </span>
        </h2>

        <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground xl:text-lg">
          Create your account and get access to a simpler, connected way of
          managing your financial experience.
        </p>

        <div className="mt-9 grid max-w-lg gap-3">
          {[
            {
              icon: UserRound,
              title: "One simple identity",
              text: "Your account gives you a single place to access Sonic Pesa.",
            },
            {
              icon: ShieldCheck,
              title: "Built with security in mind",
              text: "Modern authentication keeps your account protected.",
            },
            {
              icon: Zap,
              title: "Ready when you are",
              text: "Get started quickly and keep moving without unnecessary friction.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex gap-4 rounded-xl border border-border/70 bg-surface/60 p-4 backdrop-blur-sm"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-gradient text-white">
                <Icon size={18} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-9 flex items-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-success" />
            Simple
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-success" />
            Secure
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={14} className="text-success" />
            Connected
          </span>
        </div>
      </div>
    </section>
  );
}

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const { ref: cardRef, visible } = useReveal<HTMLDivElement>();

  const mutation = useMutation({
    mutationFn: () => signUp(name, email, password),
    onSuccess: () => navigate("/dashboard", { replace: true }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <AuthHeader
        isDark={isDark}
        onToggleTheme={() => setIsDark((value) => !value)}
      />

      <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[1600px]">
        <MarketingPanel />

        <section className="flex w-full items-center justify-center px-5 pb-12 pt-4 sm:px-8 lg:max-w-[560px] lg:px-12 lg:pb-16 lg:pt-8 xl:max-w-[600px]">
          <div
            ref={cardRef}
            className={[
              "w-full max-w-md transition-all duration-700 ease-out",
              visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            ].join(" ")}
          >
            <div className="mb-8 lg:hidden">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md">
                <Zap size={22} />
              </div>

              <h1 className="text-3xl font-semibold tracking-tight">
                Create your account
              </h1>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Get started with Sonic Pesa in less than a minute.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="hidden lg:block">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Create your account
                </h1>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Get started in less than a minute.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-7 flex flex-col gap-5"
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-foreground"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <UserRound
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-blue-500"
                    />

                    <input
                      id="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Your full name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-brand-blue-500 focus:ring-4 focus:ring-brand-blue-500/10"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                  </label>

                  <div className="relative">
                    <Mail
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-blue-500"
                    />

                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-brand-blue-500 focus:ring-4 focus:ring-brand-blue-500/10"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-blue-500"
                    />

                    <input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-brand-blue-500 focus:ring-4 focus:ring-brand-blue-500/10"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Use at least 8 characters.
                  </p>
                </div>

                {mutation.isError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-error/20 bg-error/5 px-3.5 py-3 text-sm text-error"
                  >
                    Something went wrong creating your account. Try again.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="group mt-1 flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-gradient px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
                >
                  {mutation.isPending ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </form>

              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/signin"
                  className="font-semibold text-brand-blue-500 hover:text-brand-blue-600"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
              By creating an account, you agree to our{" "}
              <Link
                to="/terms"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
