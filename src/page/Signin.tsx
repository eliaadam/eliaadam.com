// Signin.tsx
import { useState, type FormEvent, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../components/context/Authcontext";

/* -------------------------------------------------------------------------- */
/*  Shared tokens / hooks (mirrors the MaishaSoft design system)             */
/* -------------------------------------------------------------------------- */

const brand = {
  text: "text-[#0969DA] dark:text-[#4493F8]",
  border: "border-[#0969DA] dark:border-[#4493F8]",
  ring: "ring-[#0969DA]/30 dark:ring-[#4493F8]/30",
  bg: "bg-[#0969DA] dark:bg-[#4493F8]",
  bgHover: "hover:bg-[#0857b3] dark:hover:bg-[#69a6f8]",
};

function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconMail = () => (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3.5 6.5L12 13l8.5-6.5" />
  </svg>
);

const IconLock = () => (
  <svg {...iconProps}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
    <path d="M8 10.5V7.5a4 4 0 018 0v3" />
  </svg>
);

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);

const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

function AuthHeader({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="flex items-center justify-between px-6 py-6 sm:px-10">
      <Link
        to="/"
        className="font-[Space_Grotesk,sans-serif] text-lg font-medium tracking-tight text-[#1F2328] dark:text-[#E6EDF3]"
      >
        sysc
      </Link>
      <button
        onClick={onToggleTheme}
        aria-label="Toggle dark mode"
        className="grid h-8 w-8 place-items-center rounded-md border border-[#D0D7DE] text-[#59636E] transition-colors hover:border-[#1F2328] hover:text-[#1F2328] dark:border-[#30363D] dark:text-[#8B949E] dark:hover:border-[#E6EDF3] dark:hover:text-[#E6EDF3]"
      >
        {isDark ? <IconSun /> : <IconMoon />}
      </button>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export function Signin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark =
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const { ref: cardRef, visible } = useReveal<HTMLDivElement>();

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const mutation = useMutation({
    mutationFn: () => signIn(email, password),
    onSuccess: () => navigate(from, { replace: true }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1F2328] antialiased dark:bg-[#0D1117] dark:text-[#E6EDF3]">
      <AuthHeader isDark={isDark} onToggleTheme={() => setIsDark((v) => !v)} />

      <main className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
        <div
          ref={cardRef}
          className={[
            "w-full max-w-sm rounded-lg border border-[#D0D7DE] bg-white p-6 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.15)] transition-all duration-700 ease-out dark:border-[#30363D] dark:bg-[#0D1117] sm:p-8",
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          ].join(" ")}
        >
          <h1 className="font-[Space_Grotesk,sans-serif] text-2xl font-medium tracking-tight text-[#1F2328] dark:text-[#E6EDF3] sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-[#59636E] dark:text-[#8B949E]">
            Sign in to continue to your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                Email
              </label>
              <div className="relative">
                <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${brand.text}`}>
                  <IconMail />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`w-full rounded-md border border-[#D0D7DE] bg-white py-2 pl-9 pr-3 text-sm text-[#1F2328] outline-none transition-colors focus:${brand.border} focus:ring-2 ${brand.ring} dark:border-[#30363D] dark:bg-[#0D1117] dark:text-[#E6EDF3]`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                Password
              </label>
              <div className="relative">
                <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${brand.text}`}>
                  <IconLock />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`w-full rounded-md border border-[#D0D7DE] bg-white py-2 pl-9 pr-3 text-sm text-[#1F2328] outline-none transition-colors focus:${brand.border} focus:ring-2 ${brand.ring} dark:border-[#30363D] dark:bg-[#0D1117] dark:text-[#E6EDF3]`}
                />
              </div>
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Couldn't sign in. Check your details and try again.
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className={`mt-2 rounded-md ${brand.bg} px-4 py-2.5 text-sm font-medium text-white transition-colors ${brand.bgHover} disabled:opacity-60`}
            >
              {mutation.isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#59636E] dark:text-[#8B949E]">
            New here?{" "}
            <Link to="/signup" className={`font-medium ${brand.text}`}>
              Create an account
            </Link>
          </p>
        </div>
      </main>

      <footer className="px-6 pb-6 text-center text-xs text-[#8B949E] sm:px-10">
        Simple. Secure. Better.
      </footer>
    </div>
  );
}