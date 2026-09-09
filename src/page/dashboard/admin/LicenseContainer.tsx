import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Trash2 } from "lucide-react";
import { sdk, type AccessMode, type Container } from "../../../lib/sdk";
import { useAuth } from "../../../components/context/Authcontext";
import { useContainer } from "../../../components/context/ContainerContext";
import { ApiError } from "../../../lib/query/Api";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * The piece that never existed until now: licensing a capability onto
 * a container AFTER it's already been created. Before this, licensing
 * only ever happened automatically at template-instantiation time, or
 * via the one-off `manage.py license_feature` CLI command — there was
 * no way to go back and license (or revoke) a capability on an
 * existing container.
 *
 * FIX: originally required the admin to type a raw container id from
 * memory. Now browses/searches containers via `searchContainers()`
 * (the same discovery endpoint `AllContainers.tsx` uses) and picks
 * from a real list instead.
 */
export function LicenseContainer() {
  const { user } = useAuth();
  const { currentContainerId } = useContainer();
  const [selected, setSelected] = useState<Container | null>(null);

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — admin permission is checked against whichever
        container you're currently in.
      </p>
    );
  }

  if (selected) {
    return (
      <div className="max-w-xl">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
        >
          <ChevronLeft size={15} />
          Choose a different container
        </button>

        <h1 className="text-xl font-semibold tracking-tight">
          {selected.display_name}
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {selected.slug} · {selected.visibility} · {selected.status}
        </p>

        <ContainerLicenses
          containerId={selected.id}
          actorId={user!.id}
          actingContainerId={currentContainerId}
        />
      </div>
    );
  }

  return <ContainerPicker onSelect={setSelected} />;
}

function ContainerPicker({
  onSelect,
}: {
  onSelect: (container: Container) => void;
}) {
  const [q, setQ] = useState("");

  const { data: containers, isLoading } = useQuery({
    queryKey: ["admin", "license-container", "search", q],
    queryFn: () =>
      sdk.container.searchContainers({ q: q || undefined, limit: 50 }),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">
        License a container
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Pick a container to license or revoke a capability on it.
      </p>

      <input
        className={`${inputClass} mt-6 w-full`}
        placeholder="Search by name, code, or slug…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="mt-4">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </div>
        )}

        {containers && containers.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
            No containers match.
          </p>
        )}

        {containers && containers.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {containers.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.display_name}
                    </p>
                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                      {c.slug} · {c.visibility} · {c.status}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ContainerLicenses({
  containerId,
  actorId,
  actingContainerId,
}: {
  containerId: string;
  actorId: string;
  actingContainerId: string;
}) {
  const queryClient = useQueryClient();
  const [forbiddenAction, setForbiddenAction] = useState<string | null>(null);

  const licensesQuery = useQuery({
    queryKey: [
      "authority",
      "container-licenses",
      containerId,
      actingContainerId,
    ],
    queryFn: () =>
      sdk.authority.listContainerFeatureLicenses(
        containerId,
        actingContainerId,
      ),
    retry: false,
  });

  const manifestsQuery = useQuery({
    queryKey: ["capability", "manifests", containerId],
    queryFn: () => sdk.capability.listManifests(containerId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["authority", "container-licenses", containerId],
    });

  const handle403 = (action: string) => (err: unknown) => {
    if (err instanceof ApiError && err.status === 403) {
      setForbiddenAction(action);
    }
  };

  const [featureCode, setFeatureCode] = useState("");
  const [accessMode, setAccessMode] = useState<AccessMode>("role_required");

  const licenseMutation = useMutation({
    mutationFn: () =>
      sdk.authority.licenseFeature({
        container_id: containerId,
        acting_container_id: actingContainerId,
        feature_code: featureCode,
        access_mode: accessMode,
        granted_by_actor_id: actorId,
      }),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidate();
      setFeatureCode("");
    },
    onError: handle403("license capabilities on this container"),
  });

  const revokeMutation = useMutation({
    mutationFn: (code: string) =>
      sdk.authority.revokeFeatureLicense(containerId, code, actingContainerId),
    onSuccess: () => {
      setForbiddenAction(null);
      invalidate();
    },
    onError: handle403("revoke licenses on this container"),
  });

  const isForbidden =
    licensesQuery.error instanceof ApiError &&
    licensesQuery.error.status === 403;

  if (isForbidden) {
    return (
      <p className="mt-8 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        You don't have admin access to view or change this container's licenses.
      </p>
    );
  }

  return (
    <div className="mt-8">
      {forbiddenAction && (
        <p className="mb-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          You don't have admin access to {forbiddenAction}.
        </p>
      )}

      <h2 className="text-sm font-semibold tracking-tight">
        Currently licensed
      </h2>
      {licensesQuery.isLoading && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}
      {licensesQuery.data && licensesQuery.data.length === 0 && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
          Nothing licensed yet.
        </p>
      )}
      <ul className="mt-2 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {licensesQuery.data?.map((license) => (
          <li
            key={license.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium">{license.feature_code}</span>{" "}
              <span className="text-xs text-neutral-500 dark:text-neutral-500">
                ({license.access_mode},{" "}
                {license.enabled ? "enabled" : "disabled"})
              </span>
            </div>
            {license.enabled && (
              <button
                type="button"
                onClick={() => revokeMutation.mutate(license.feature_code)}
                aria-label={`Revoke ${license.feature_code}`}
                className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-sm font-semibold tracking-tight">
        License a new capability
      </h2>
      <div className="mt-2 flex items-center gap-2">
        <select
          className={`${inputClass} flex-1`}
          value={featureCode}
          onChange={(e) => setFeatureCode(e.target.value)}
        >
          <option value="">Choose a capability…</option>
          {manifestsQuery.data
            ?.filter((m) => !m.licensed)
            .map((m) => (
              <option key={m.feature_code} value={m.feature_code}>
                {m.display_name} ({m.feature_code})
              </option>
            ))}
        </select>
        <select
          className={inputClass}
          value={accessMode}
          onChange={(e) => setAccessMode(e.target.value as AccessMode)}
        >
          <option value="role_required">role_required</option>
          <option value="open_to_members">open_to_members</option>
        </select>
        <button
          type="button"
          disabled={!featureCode || licenseMutation.isPending}
          onClick={() => licenseMutation.mutate()}
          className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          License
        </button>
      </div>
    </div>
  );
}
