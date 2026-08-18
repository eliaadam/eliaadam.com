import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import ChatsPanel from "./ChatsPanel";
import GroupsPanel from "./GroupsPanel";
import BroadcastsPanel from "./BroadcastsPanel";
import CommunitiesPanel from "./CommunitiesPanel";
import {
  ChatBubbleIcon,
  GlobeIcon,
  MegaphoneIcon,
  UsersIcon,
} from "./commShared";

type SubTab = "chats" | "groups" | "broadcasts" | "communities";

export default function CommunicationsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (code: string) => permissions.includes(code);

  useEffect(() => {
    localStorage.setItem("maicore_container_id", containerId);
  }, [containerId]);

  const tabs: { key: SubTab; label: string; icon: ReactNode; show: boolean }[] =
    [
      {
        key: "chats",
        label: "Chats",
        icon: <ChatBubbleIcon />,
        show: can("system.communications.dm.send"),
      },
      {
        key: "groups",
        label: "Groups",
        icon: <UsersIcon />,
        show:
          can("system.communications.group.create") ||
          can("system.communications.group.message.send"),
      },
      {
        key: "broadcasts",
        label: "Broadcasts",
        icon: <MegaphoneIcon />,
        show:
          can("system.communications.broadcast.send") ||
          can("system.communications.broadcast.create") ||
          can("system.communications.broadcast.view"),
      },
      {
        key: "communities",
        label: "Communities",
        icon: <GlobeIcon />,
        show:
          can("system.communications.community.create") ||
          can("system.communications.community.manage"),
      },
    ];

  const visible = tabs.filter((t) => t.show);
  const storageKey = `maicore_comm_tab_${containerId}`;

  const [active, setActive] = useState<SubTab | null>(() => {
    if (typeof window === "undefined") return visible[0]?.key ?? null;
    const saved = window.localStorage.getItem(storageKey) as SubTab | null;
    return saved && visible.some((t) => t.key === saved)
      ? saved
      : (visible[0]?.key ?? null);
  });

  // Persist the chosen tab per container so switching containers and coming
  // back restores where the user left off.
  useEffect(() => {
    if (active) window.localStorage.setItem(storageKey, active);
  }, [active, storageKey]);

  // If permissions change (or we land on a container where the saved tab
  // is no longer visible), fall back to the first visible tab instead of
  // rendering a blank pane.
  useEffect(() => {
    setActive((current) =>
      current && visible.some((t) => t.key === current)
        ? current
        : (visible[0]?.key ?? null),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, permissions.join(",")]);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Communications is enabled here, but you hold no messaging permissions.
      </p>
    );
  }

  const activeIndex = Math.max(
    0,
    visible.findIndex((t) => t.key === active),
  );

  const onTabKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (activeIndex + dir + visible.length) % visible.length;
    setActive(visible[next].key);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Communications"
        onKeyDown={onTabKeyDown}
        className="flex gap-1 mb-4"
      >
        {visible.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                on
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {active === "chats" && (
        <ChatsPanel containerId={containerId} permissions={permissions} />
      )}
      {active === "groups" && (
        <GroupsPanel containerId={containerId} permissions={permissions} />
      )}
      {active === "broadcasts" && (
        <BroadcastsPanel containerId={containerId} permissions={permissions} />
      )}
      {active === "communities" && (
        <CommunitiesPanel containerId={containerId} permissions={permissions} />
      )}
    </div>
  );
}
