import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCog, Boxes } from "lucide-react";
import { sdk, type Actor } from "../../../lib/sdk";
import { ApiError } from "../../../lib/query/Api";
import { useContainer } from "../../../components/context/ContainerContext";

// Known actor types, kept as a small hardcoded list rather than a
// dynamic lookup — ActorType is data-driven on the backend (a real
// table, not a Python enum — see the development guide's own note on
// this), so this list can go stale if a new type is added without
// updating it here too. Worth revisiting with a real "list actor
// types" endpoint if the set grows much past this.
const ACTOR_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "person", label: "Person" },
  { value: "container", label: "Container" },
];

const REPRESENTED_TYPE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "container", label: "Represents a container" },
];

function statusClasses(status: string): string {
  if (status === "active") {
    return "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white";
  }
  if (status === "suspended") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"; // archived
}

export function Actors() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [actorTypeCode, setActorTypeCode] = useState("");
  const [representedType, setRepresentedType] = useState("");
  const [forbiddenAction, setForbiddenAction] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { currentContainerId } = useContainer();

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "admin",
      "actors",
      currentContainerId,
      search,
      status,
      actorTypeCode,
      representedType,
    ],
    queryFn: () =>
      sdk.identity.listActors({
        containerId: currentContainerId!,
        search: search || undefined,
        status: status || undefined,
        actorTypeCode: actorTypeCode || undefined,
        representedType: representedType || undefined,
      }),
    enabled: Boolean(currentContainerId),
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "actors"] });

  const handle403 = (action: string) => (err: unknown) => {
    if (err instanceof ApiError && err.status === 403) {
      setForbiddenAction(action);
    }
  };

  const suspend = useMutation({
    mutationFn: (actorId: string) =>
      sdk.identity.suspendActor(actorId, currentContainerId!),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidate();
    },
    onError: handle403("suspend actors"),
  });
  const activate = useMutation({
    mutationFn: (actorId: string) =>
      sdk.identity.activateActor(actorId, currentContainerId!),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidate();
    },
    onError: handle403("activate actors"),
  });
  const archive = useMutation({
    mutationFn: (actorId: string) =>
      sdk.identity.archiveActor(actorId, currentContainerId!),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidate();
    },
    onError: handle403("archive actors"),
  });

  const pendingId =
    suspend.variables ?? activate.variables ?? archive.variables ?? null;
  const isMutating =
    suspend.isPending || activate.isPending || archive.isPending;

  const isForbidden = error instanceof ApiError && error.status === 403;

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — admin permission is checked against whichever
        container you're currently in.
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Actors</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Every actor in the system — people, service accounts, and actors
        representing something else (a container, so far).
      </p>

      {isForbidden && (
        <p className="mt-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          You don't have admin access to view actors.
        </p>
      )}
      {forbiddenAction && (
        <p className="mt-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          You don't have admin access to {forbiddenAction}.
        </p>
      )}

      {!isForbidden && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by name, display name, or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[12rem] rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={actorTypeCode}
              onChange={(e) => setActorTypeCode(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
            >
              {ACTOR_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={representedType}
              onChange={(e) => setRepresentedType(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
            >
              {REPRESENTED_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            {isLoading && (
              <ul className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <li
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
                  />
                ))}
              </ul>
            )}

            {error && !isForbidden && (
              <div className="rounded-lg border border-neutral-200 p-6 text-sm dark:border-neutral-800">
                <p className="font-medium">Couldn't load actors.</p>
              </div>
            )}

            {data && data.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
                <UserCog
                  className="mx-auto text-neutral-400 dark:text-neutral-600"
                  size={22}
                />
                <p className="mt-3 text-sm font-medium">No actors match</p>
              </div>
            )}

            {data && data.length > 0 && (
              <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {data.map((actor: Actor) => (
                  <li
                    key={actor.id}
                    className="flex items-center justify-between gap-4 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {actor.display_name}
                        </p>
                        {actor.represented_type && (
                          <span
                            title={`Represents ${actor.represented_type} ${actor.represented_id}`}
                            className="flex flex-none items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          >
                            <Boxes size={11} />
                            {actor.represented_type}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                        {actor.actor_type_code}
                        {actor.name ? ` · @${actor.name}` : ""}
                        {actor.code ? ` · ${actor.code}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(actor.status)}`}
                      >
                        {actor.status}
                      </span>
                      {actor.status !== "active" && (
                        <button
                          type="button"
                          disabled={isMutating && pendingId === actor.id}
                          onClick={() => activate.mutate(actor.id)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:text-white dark:hover:bg-neutral-900"
                        >
                          Activate
                        </button>
                      )}
                      {actor.status === "active" && (
                        <button
                          type="button"
                          disabled={isMutating && pendingId === actor.id}
                          onClick={() => suspend.mutate(actor.id)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                        >
                          Suspend
                        </button>
                      )}
                      {actor.status !== "archived" && (
                        <button
                          type="button"
                          disabled={isMutating && pendingId === actor.id}
                          onClick={() => archive.mutate(actor.id)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
