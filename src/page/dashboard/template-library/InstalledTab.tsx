import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { TemplateInstallSummary } from "../../../lib/sdk/domains/templateLibrary";
import { errorMessage, errorTextClass, primaryButtonClass } from "./ui";

export function InstalledTab({ containerId, onOpen }: { containerId: string; onOpen: (id: string) => void }) {
  const { data: installs, isLoading } = useQuery({
    queryKey: ["template-library", "installs", containerId],
    queryFn: () => sdk.templateLibrary.listInstalls(containerId),
  });

  if (isLoading) return <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>;
  if (!installs || installs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-500">
        Nothing has been applied to this container yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {installs.map((i) => (
        <InstallRow key={i.id} install={i} containerId={containerId} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function InstallRow({ install, containerId, onOpen }: { install: TemplateInstallSummary; containerId: string; onOpen: (id: string) => void }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    // Installing the latest version of something already installed is an
    // upgrade — the duplicate guard is per (template, VERSION, container).
    mutationFn: () => sdk.templateLibrary.installTemplate(containerId, install.template_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["template-library", "installs", containerId] }),
  });

  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => onOpen(install.template_id)} className="truncate text-sm font-medium hover:underline">
            {install.template_name}
          </button>
          <span className="flex-none text-[11px] text-neutral-500 dark:text-neutral-500">v{install.version_number}</span>
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${
              install.status === "applied"
                ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            }`}
          >
            {install.status}
          </span>
        </span>
        <span className="flex flex-none items-center gap-3 text-xs text-neutral-500 dark:text-neutral-500">
          {install.created_at ? new Date(install.created_at).toLocaleDateString() : ""}
          {install.update_available && (
            <button type="button" onClick={() => update.mutate()} disabled={update.isPending} className={primaryButtonClass}>
              {update.isPending ? "Updating…" : `Update to v${install.latest_version_number}`}
            </button>
          )}
        </span>
      </div>
      {install.status === "failed" && install.error && <p className={errorTextClass}>{install.error}</p>}
      {update.isError && <p className={errorTextClass}>{errorMessage(update.error, "Couldn't update.")}</p>}
    </li>
  );
}
