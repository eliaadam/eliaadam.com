import { useAuth } from "../../hooks/useAuth";

export default function AdminOverviewPage() {
  const { actor } = useAuth();

  return (
    <div className="p-8 max-w-[960px] mx-auto">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-8 py-10">
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-neutral-200 dark:text-neutral-800"
          viewBox="0 0 960 120"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path
            className="animate-[wave_10s_ease-in-out_infinite] motion-reduce:animate-none"
            d="M0,60 C160,20 320,100 480,60 C640,20 800,100 960,60 L960,120 L0,120 Z"
            fill="currentColor"
            opacity="0.5"
          />
          <path
            className="animate-[wave_14s_ease-in-out_infinite_reverse] motion-reduce:animate-none"
            d="M0,70 C180,110 340,30 480,70 C620,110 780,30 960,70 L960,120 L0,120 Z"
            fill="currentColor"
            opacity="0.35"
          />
        </svg>

        <div className="relative">
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Welcome back, {actor?.display_name ?? "Admin"}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            Use navigation to explore available options.
          </p>
        </div>
      </header>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-2%) translateY(4px); }
        }
      `}</style>
    </div>
  );
}
