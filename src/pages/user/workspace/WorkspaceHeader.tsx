import type { Workspace } from "./types";

interface WorkspaceHeaderProps {
  container: Workspace["container"];
  template: string;
}

export function WorkspaceHeader({ container, template }: WorkspaceHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1
          className="font-semibold text-black dark:text-white m-0"
          style={{ fontSize: "var(--ux-font-heading)" }}
        >
          {container.display_name}
        </h1>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
          {container.code}
        </span>
        {container.slug && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
            title="Public address"
          >
            /{container.slug}
          </span>
        )}
        {container.is_root && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
            root
          </span>
        )}
        {template !== "standard" && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
            title="Presentation template"
          >
            {template}
          </span>
        )}
      </div>
    </header>
  );
}
