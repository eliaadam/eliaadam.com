import { useState } from "react";
import { useContainer } from "../../components/context/ContainerContext";
import { SettingsScopePanel } from "../../components/settings/SettingsScopePanel";
import type { SettingScope } from "../../lib/sdk/domains/settings";

const pillTabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-black text-white dark:bg-white dark:text-black"
      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
  }`;

/** Generic settings admin — every capability's own registered
 * settings (core.payment.gateway.for.<purpose> among them) show up
 * here automatically via the registry, with no code in this file
 * that knows about any specific capability. */
export function SettingsDashboard() {
  const { currentContainerId } = useContainer();
  const [scope, setScope] = useState<SettingScope>("container");

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <div className="mt-4 flex gap-1.5 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <button
          type="button"
          className={pillTabClass(scope === "platform")}
          onClick={() => setScope("platform")}
        >
          Platform
        </button>
        <button
          type="button"
          className={pillTabClass(scope === "container")}
          onClick={() => setScope("container")}
        >
          This Container
        </button>
        <button
          type="button"
          className={pillTabClass(scope === "actor")}
          onClick={() => setScope("actor")}
        >
          My Settings
        </button>
      </div>

      <div className="mt-5">
        <SettingsScopePanel
          scope={scope}
          containerId={currentContainerId ?? undefined}
        />
      </div>
    </div>
  );
}
