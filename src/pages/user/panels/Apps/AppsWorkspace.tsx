import { useState } from "react";
import InstalledAppsPanel from "./InstalledAppsPanel";
import AppDirectoryPanel from "./AppDirectoryPanel";
import DeveloperAppsPanel from "./DeveloperAppsPanel";
import PluginsPanel from "./PluginsPanel";

/**
 * Apps workspace — three faces of the developer platform:
 *   Installed  → apps running in this container (+ uninstall)
 *   Directory  → public apps to install (with consent)
 *   Developer  → apps this container owns / registers
 */
export default function AppsWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const tabs = [
    {
      key: "installed",
      label: "Installed",
      show: can("system.apps.installation.view"),
    },
    {
      key: "directory",
      label: "Directory",
      show: can("system.apps.installation.install"),
    },
    {
      key: "developer",
      label: "Developer",
      show: can("system.apps.app.view"),
    },
    {
      key: "plugins",
      label: "Plugins",
      show: can("system.apps.installation.view"),
    },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? "installed");

  if (tabs.length === 0) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        You don't hold any apps permissions here.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 px-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active === t.key ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {active === "installed" && (
          <InstalledAppsPanel
            containerId={containerId}
            permissions={permissions}
          />
        )}
        {active === "directory" && (
          <AppDirectoryPanel
            containerId={containerId}
            permissions={permissions}
          />
        )}
        {active === "developer" && (
          <DeveloperAppsPanel
            containerId={containerId}
            permissions={permissions}
          />
        )}
        {active === "plugins" && <PluginsPanel containerId={containerId} />}
      </div>
    </div>
  );
}
