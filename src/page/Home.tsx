import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/context/ThemeContext";

const domains = [
  "Container",
  "Authority",
  "Registry",
  "Capability",
  "Ownership",
];

export function Home() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight">Sysc</span>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-2xl flex-col items-start px-6 pt-16 pb-24 sm:pt-24">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          One platform, built domain by domain.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          Containers, authorization, and a shared catalogue — designed as
          separate, well-defined pieces instead of one sprawling application.
        </p>

        <div className="mt-9 flex items-center gap-3">
          <Link
            to="/signup"
            className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
          >
            Create account
          </Link>
          <Link
            to="/signin"
            className="rounded-md px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Sign in
          </Link>
        </div>

        <ul className="mt-16 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500 dark:text-neutral-500">
          {domains.map((domain) => (
            <li key={domain}>{domain}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}
