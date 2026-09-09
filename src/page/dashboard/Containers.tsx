import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Compass, Folders, Users } from "lucide-react";
import { sdk, type Container } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";

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
        {tab === "mine" ? <MyContainersTab /> : <DiscoverTab />}
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
  icon: typeof Compass;
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

function MyContainersTab() {
  const { containers, currentContainerId, switchContainer, isLoading } =
    useContainer();

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <li
            key={i}
            className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </ul>
    );
  }

  if (containers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <Folders
          className="mx-auto text-neutral-400 dark:text-neutral-600"
          size={22}
        />
        <p className="mt-3 text-sm font-medium">No containers yet</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Instantiate one from a template, join a public one, or redeem an
          invitation.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {containers.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between gap-3 px-4 py-3.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{c.display_name}</p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
              {c.slug} · {c.visibility}
              {c.id === currentContainerId && (
                <span className="ml-2 text-black dark:text-white">current</span>
              )}
            </p>
          </div>
          <div className="flex flex-none items-center gap-2">
            {c.id !== currentContainerId && (
              <button
                type="button"
                onClick={() => switchContainer(c.id)}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                Switch
              </button>
            )}
            <Link
              to={`/dashboard/containers/${c.id}/members`}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-900"
            >
              <Users size={13} />
              Members
            </Link>
            <Link
              to={`/dashboard/containers/${c.id}/join-requests`}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              Requests
            </Link>
            <Link
              to={`/dashboard/containers/${c.id}/settings`}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              Settings
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DiscoverTab() {
  const { user } = useAuth();
  const { containers: myContainers, refresh } = useContainer();
  const queryClient = useQueryClient();
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

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
      <ul className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <li
            key={i}
            className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </ul>
    );
  }

  if (joinable.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <Compass
          className="mx-auto text-neutral-400 dark:text-neutral-600"
          size={22}
        />
        <p className="mt-3 text-sm font-medium">
          Nothing to discover right now
        </p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          No containers are open to join or request, or you're already in all of
          them.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {joinable.map((c: Container) => (
        <li
          key={c.id}
          className="flex items-center justify-between gap-3 px-4 py-3.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{c.display_name}</p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
              {c.slug} · {c.visibility}
            </p>
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
                requestMutation.isPending && requestMutation.variables === c.id
              }
              className="flex-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {requestMutation.isPending && requestMutation.variables === c.id
                ? "Requesting…"
                : "Request to join"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
