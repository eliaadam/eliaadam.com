import { useState } from "react";
import DiscoverEventsPanel from "./DiscoverEventsPanel";

import MyEventsPanel from "./MyEventsPanel";

export default function EventsWorkspace({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);

  const tabs = [
    { key: "mine", label: "My Events", show: can("system.events.event.view") },
    { key: "discover", label: "Discover", show: true },
  ].filter((t) => t.show);

  const [active, setActive] = useState(tabs[0]?.key ?? "");

  if (tabs.length === 0) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        You don't have events access here.
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
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === t.key
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {active === "mine" && (
          <MyEventsPanel
            scope={{ type: "container", containerId }}
            permissions={permissions}
          />
        )}
        {active === "discover" && <DiscoverEventsPanel />}
      </div>
    </div>
  );
}
