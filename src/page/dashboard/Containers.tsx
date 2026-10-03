import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Compass,
  Folders,
  Search,
  Globe,
  Lock,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { sdk, type Container } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";
import { ContainerAvatar } from "../../components/ui/ContainerAvatar";

type Tab = "discover" | "mine";

/**
 * Replaces the old Registry-asset "Recent" feed (dropped, per
 * decision — that catalogue had nothing to do with containers).
 *
 * "Discover" = containers whose policy allows self-serve join, that
 * this actor isn't already a member of — backed by
 * `sdk.container.searchContainers({ publicJoinOnly: true })`, the
 * discovery endpoint this app didn't have until now.
 *
 * "My Containers" = `ContainerContext`'s own membership list, surfaced
 * as a real page (not just the sidebar switcher) — includes
 * instantiated hierarchies now that those correctly create a
 * membership for their owner.
 *
 * FIX (this revision): per-row Members / Requests / Settings links
 * removed — those now live in the profile nav, scoped to whichever
 * container is CURRENTLY selected and gated to its owner (see
 * `DashboardLayout.tsx`'s `useCurrentContainerNavItems`). This page is
 * purely about seeing and switching between containers now, not
 * managing one — switch to the container you want to manage, then use
 * the profile menu.
 */
export function Containers() {
  const [tab, setTab] = useState<Tab>("mine");

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Containers</h1>

      <div className="mt-4 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        <TabButton
          active={tab === "mine"}
          onClick={() => setTab("mine")}
          icon={Folders}
        >
          My Containers
        </TabButton>
        <TabButton
          active={tab === "discover"}
          onClick={() => setTab("discover")}
          icon={Compass}
        >
          Discover
        </TabButton>
      </div>

      <div className="mt-6">
        {tab === "mine" ? (
          <MyContainersTab onDiscover={() => setTab("discover")} />
        ) : (
          <DiscoverTab />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-black text-black dark:border-white dark:text-white"
          : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-100",
      ].join(" ")}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                */
/* -------------------------------------------------------------------------- */

function VisibilityBadge({ visibility }: { visibility: string }) {
  const isPublic = visibility === "public";
  const Icon = isPublic ? Globe : Lock;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        isPublic
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
      ].join(" ")}
    >
      <Icon size={10} />
      {visibility}
    </span>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-3">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-8 pr-3 text-sm outline-none ring-black/20 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:ring-white/30 dark:focus:border-white"
      />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actions?: { label: string; to?: string; onClick?: () => void }[];
}) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
      <Icon
        className="mx-auto text-neutral-400 dark:text-neutral-600"
        size={22}
      />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {body}
      </p>

      {actions && actions.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {actions.map((action) =>
            action.to ? (
              <Link
                key={action.label}
                to={action.to}
                className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function RowSkeleton() {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="size-9 flex-none animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* My Containers                                                              */
/* -------------------------------------------------------------------------- */

// Only bother showing a search box once scanning the list by eye stops
// being the faster option.
const SEARCH_THRESHOLD = 6;

function MyContainersTab({ onDiscover }: { onDiscover: () => void }) {
  const { containers, currentContainerId, switchContainer, isLoading } =
    useContainer();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return containers;
    return containers.filter(
      (c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [containers, query]);

  if (isLoading) {
    return (
      <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        <RowSkeleton />
        <RowSkeleton />
      </ul>
    );
  }

  if (containers.length === 0) {
    return (
      <EmptyState
        icon={Folders}
        title="No containers yet"
        body="Instantiate one from a template, join a public one, or redeem an invitation."
        actions={[
          { label: "Browse templates", to: "/dashboard/templates" },
          { label: "Discover containers", onClick: onDiscover },
        ]}
      />
    );
  }

  return (
    <div>
      {containers.length > SEARCH_THRESHOLD && (
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search your containers…"
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          body={`Nothing matches "${query}".`}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {filtered.map((c) => {
            const isCurrent = c.id === currentContainerId;

            return (
              <li
                key={c.id}
                className={[
                  "flex items-center gap-3 px-4 py-3.5 transition-colors",
                  isCurrent
                    ? "bg-neutral-50 dark:bg-neutral-900/60"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900/40",
                ].join(" ")}
              >
                <ContainerAvatar
                  containerId={c.id}
                  name={c.display_name}
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {c.display_name}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex flex-none items-center gap-1 rounded-full bg-black px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-black">
                        <CheckCircle2 size={10} />
                        Current
                      </span>
                    )}
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => switchContainer(c.id)}
                    className="flex-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                  >
                    Switch
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Discover                                                                   */
/* -------------------------------------------------------------------------- */

function DiscoverTab() {
  const { user } = useAuth();
  const { containers: myContainers, refresh } = useContainer();
  const queryClient = useQueryClient();
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const { data: discoverable, isLoading } = useQuery({
    queryKey: ["containers", "discover"],
    queryFn: () =>
      sdk.container.searchContainers({
        status: "active",
        excludeVisibility: "private",
      }),
  });

  const myIds = new Set(myContainers.map((c) => c.id));
  const joinable = (discoverable ?? []).filter((c) => !myIds.has(c.id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return joinable;
    return joinable.filter(
      (c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [joinable, query]);

  const joinMutation = useMutation({
    mutationFn: (containerId: string) =>
      sdk.container.joinContainer({
        container_id: containerId,
        actor_id: user!.id,
        role: "member",
      }),
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ["containers", "discover"] });
    },
  });

  const requestMutation = useMutation({
    mutationFn: (containerId: string) =>
      sdk.container.requestToJoin(containerId),
    onSuccess: (_joinRequest, containerId) => {
      setRequestedIds((prev) => new Set(prev).add(containerId));
    },
  });

  if (isLoading) {
    return (
      <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        <RowSkeleton />
        <RowSkeleton />
      </ul>
    );
  }

  if (joinable.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Nothing to discover right now"
        body="No containers are open to join or request, or you're already in all of them."
      />
    );
  }

  return (
    <div>
      {joinable.length > SEARCH_THRESHOLD && (
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search discoverable containers…"
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          body={`Nothing matches "${query}".`}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {filtered.map((c: Container) => (
            <li
              key={c.id}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
            >
              <ContainerAvatar
                containerId={c.id}
                name={c.display_name}
                size="sm"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.display_name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                    {c.slug}
                  </p>
                  <VisibilityBadge visibility={c.visibility} />
                </div>
              </div>

              {c.visibility === "public" ? (
                <button
                  type="button"
                  onClick={() => joinMutation.mutate(c.id)}
                  disabled={
                    joinMutation.isPending && joinMutation.variables === c.id
                  }
                  className="flex-none rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
                >
                  {joinMutation.isPending && joinMutation.variables === c.id
                    ? "Joining…"
                    : "Join"}
                </button>
              ) : requestedIds.has(c.id) ? (
                <span className="flex-none text-xs text-neutral-500 dark:text-neutral-500">
                  Request sent
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => requestMutation.mutate(c.id)}
                  disabled={
                    requestMutation.isPending &&
                    requestMutation.variables === c.id
                  }
                  className="flex-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  {requestMutation.isPending &&
                  requestMutation.variables === c.id
                    ? "Requesting…"
                    : "Request to join"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
