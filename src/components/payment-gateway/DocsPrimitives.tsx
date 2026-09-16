import { useState } from "react";
import { Copy } from "lucide-react";

/**
 * Shared rendering primitives for the public /docs site — one set of
 * building blocks every section page composes from, so all 7 read
 * consistently rather than each inventing its own code-block/table
 * styling. No data fetching, no auth context — every /docs page is
 * static, public content.
 */

export function DocSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {children}
      </div>
    </section>
  );
}

export function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative mt-3">
      <pre className="overflow-x-auto rounded-md bg-neutral-900 p-3 text-xs text-neutral-100 dark:bg-black">
        <code>{children}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        aria-label="Copy"
        className="absolute right-2 top-2 rounded p-1 text-neutral-400 hover:text-white"
      >
        <Copy size={13} />
      </button>
      {copied && (
        <span className="absolute right-8 top-2.5 text-[10px] text-neutral-400">
          Copied
        </span>
      )}
    </div>
  );
}

export function DocTable({ rows }: { rows: { cells: string[] }[] }) {
  return (
    <table className="mt-3 w-full border-collapse text-xs">
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-b border-neutral-200 dark:border-neutral-800"
          >
            {row.cells.map((cell, j) => (
              <td
                key={j}
                className={`py-2 ${j === 0 ? "pr-4 font-mono font-medium" : "text-neutral-600 dark:text-neutral-400"}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning";
  children: React.ReactNode;
}) {
  const styles =
    tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
      : "border-neutral-300 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";

  return (
    <div className={`mt-3 rounded-md border p-3 text-xs ${styles}`}>
      {children}
    </div>
  );
}

export function StepList({
  steps,
}: {
  steps: { title: string; description: string }[];
}) {
  return (
    <ol className="mt-3 flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white dark:bg-white dark:text-black">
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DocPageTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}
