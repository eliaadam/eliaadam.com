import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { maicore } from "../../lib/maicore";
import type {
  Actor,
  ActorType,
  ActorStatus,
  MaicoreValidationError,
} from "../../lib/maicore-sdk";

const keys = {
  actors: ["admin", "actors"] as const,
  actorTypes: ["admin", "actorTypes"] as const,
};

export default function ActorManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | ActorStatus>("all");

  const actorsQuery = useQuery({
    queryKey: keys.actors,
    queryFn: () => maicore.identity.actors.list(),
  });

  const actors = actorsQuery.data ?? [];
  const filtered =
    filter === "all" ? actors : actors.filter((a) => a.status === filter);

  return (
    <div className="p-8 max-w-[1100px]">
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white m-0">
            Actor Management
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {actors.length} actor{actors.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
        >
          {showCreate ? "Cancel" : "+ New Actor"}
        </button>
      </header>

      {showCreate && <CreateActorForm onCreated={() => setShowCreate(false)} />}

      {/* Filters */}
      <div className="flex gap-1.5 mb-5">
        {(["all", "active", "suspended", "retired"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-md border transition ${
              filter === s
                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                : "bg-white dark:bg-black text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "all"
              ? ` (${actors.length})`
              : ` (${actors.filter((a) => a.status === s).length})`}
          </button>
        ))}
      </div>

      {actorsQuery.isLoading && (
        <p className="text-sm text-neutral-400 dark:text-neutral-600 py-10 text-center">
          Loading actors…
        </p>
      )}

      {actorsQuery.isError && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white mb-4 font-medium">
          ! Failed to load actors.{" "}
          <button
            onClick={() => actorsQuery.refetch()}
            className="underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {!actorsQuery.isLoading && filtered.length > 0 && (
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  Display Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  Code
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  ID
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((actor) => (
                <ActorRow key={actor.id} actor={actor} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!actorsQuery.isLoading && filtered.length === 0 && (
        <p className="text-sm text-neutral-400 dark:text-neutral-600 py-10 text-center">
          {filter === "all" ? "No actors found." : `No ${filter} actors.`}
        </p>
      )}
    </div>
  );
}

function ActorRow({ actor }: { actor: Actor }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<string | null>(null);

  const lifecycleMutation = useMutation({
    mutationFn: async (action: string) => {
      switch (action) {
        case "activate":
          return maicore.identity.actors.activate(actor.id);
        case "suspend":
          return maicore.identity.actors.suspend(actor.id);
        case "retire":
          return maicore.identity.actors.retire(actor.id);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.actors });
      setConfirming(null);
    },
  });

  const availableActions = getAvailableActions(actor.status);

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-900 last:border-b-0">
      <td className="px-4 py-3.5 text-sm text-black dark:text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center text-[13px] font-semibold flex-shrink-0">
            {actor.display_name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <span className="font-medium">{actor.display_name}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm font-mono text-neutral-500 dark:text-neutral-400">
        {actor.code ?? "—"}
      </td>
      <td className="px-4 py-3.5 text-sm">
        <StatusBadge status={actor.status} />
      </td>
      <td className="px-4 py-3.5 text-xs font-mono text-neutral-500 dark:text-neutral-400">
        {actor.id.slice(0, 8)}…
      </td>
      <td className="px-4 py-3.5 text-right">
        {confirming ? (
          <div className="flex gap-2 items-center justify-end">
            <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
              {confirming} {actor.display_name}?
            </span>
            <button
              onClick={() => lifecycleMutation.mutate(confirming)}
              disabled={lifecycleMutation.isPending}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
            >
              {lifecycleMutation.isPending ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5 justify-end">
            {availableActions.map((action) => (
              <button
                key={action}
                onClick={() => setConfirming(action)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${
                  action === "retire"
                    ? "border-black dark:border-white text-black dark:text-white font-semibold"
                    : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: ActorStatus }) {
  const base =
    "inline-block px-2 py-[3px] text-[11px] font-semibold rounded-full uppercase tracking-wide";
  if (status === "active") {
    return (
      <span
        className={`${base} bg-black text-white dark:bg-white dark:text-black`}
      >
        {status}
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span
        className={`${base} border border-black dark:border-white text-black dark:text-white`}
      >
        {status}
      </span>
    );
  }
  return (
    <span
      className={`${base} border border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400`}
    >
      {status}
    </span>
  );
}

function getAvailableActions(status: ActorStatus): string[] {
  switch (status) {
    case "active":
      return ["suspend", "retire"];
    case "suspended":
      return ["activate", "retire"];
    case "retired":
      return [];
    default:
      return [];
  }
}

function CreateActorForm({ onCreated }: { onCreated: () => void }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [typeId, setTypeId] = useState("");

  const typesQuery = useQuery({
    queryKey: keys.actorTypes,
    queryFn: () => maicore.identity.actors.listActorTypes(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      maicore.identity.actors.create({
        actor_type_id: typeId,
        display_name: displayName,
        code: code || undefined,
        status: "active",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.actors });
      setDisplayName("");
      setCode("");
      setTypeId("");
      onCreated();
    },
  });

  let errorMessage: string | null = null;
  let fieldErrors: Record<string, string[]> | null = null;

  if (createMutation.error) {
    const err = createMutation.error;
    if (typeof err === "object" && err !== null && "errors" in err) {
      fieldErrors = (err as MaicoreValidationError).errors;
      errorMessage = (err as MaicoreValidationError).message;
    } else {
      errorMessage =
        err instanceof Error ? err.message : "Failed to create actor.";
    }
  }

  const fieldError = (field: string): string | null =>
    fieldErrors?.[field]?.[0] ?? null;
  const types: ActorType[] = typesQuery.data ?? [];

  if (types.length > 0 && !typeId) {
    setTypeId(types[0].id);
  }

  const inputBase =
    "w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        Create New Actor
      </h3>

      {errorMessage && !fieldErrors && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white mb-4 font-medium">
          ! {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane Doe"
            required
            className={`${inputBase} ${fieldError("display_name") ? "border-black dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}
          />
          {fieldError("display_name") && (
            <p className="text-xs text-black dark:text-white font-medium m-0">
              {fieldError("display_name")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Code (optional)
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="jane-doe or jane@example.com"
            className={`${inputBase} border-neutral-300 dark:border-neutral-700`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Actor Type *
          </label>
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className={`${inputBase} border-neutral-300 dark:border-neutral-700`}
          >
            <option value="">Select type…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.display_name} ({t.code})
              </option>
            ))}
          </select>
          {fieldError("actor_type_id") && (
            <p className="text-xs text-black dark:text-white font-medium m-0">
              {fieldError("actor_type_id")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !displayName || !typeId}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          {createMutation.isPending ? "Creating…" : "Create Actor"}
        </button>
      </div>
    </div>
  );
}
